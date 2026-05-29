import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Platform,
  PermissionsAndroid,
  Alert,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import BackgroundJob from 'react-native-background-actions';

interface BackgroundOptions {
  taskName: string;
  taskTitle: string;
  taskDesc: string;
  taskIcon: { name: string; type: string };
  color: string;
  linkingURI: string;
}

const backgroundOptions: BackgroundOptions = {
  taskName: 'CalorieTracker',
  taskTitle: 'Workout Session Active',
  taskDesc: 'Calculating calories burned...',
  taskIcon: { name: 'ic_launcher', type: 'mipmap' },
  color: '#06b6d4',
  linkingURI: 'caltracker://home',
};

export default function App() {
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const [calories, setCalories] = useState<number>(0);
  const [speed, setSpeed] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0); // in seconds
  const [hasPermissions, setHasPermissions] = useState<boolean>(false);

  const caloriesRef = useRef<number>(0);
  const durationRef = useRef<number>(0);
  const watchIdRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Permissions Routine
  const requestAllPermissions = async (): Promise<boolean> => {
    if (Platform.OS === 'ios') {
      const auth = await Geolocation.requestAuthorization('always');
      return auth === 'granted';
    }

    if (Platform.OS === 'android') {
      try {
        const fineLocationGranted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        );
        if (fineLocationGranted !== PermissionsAndroid.RESULTS.GRANTED) {
          return false;
        }
        if (Platform.Version >= 29) {
          const backgroundLocationGranted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_BACKGROUND_LOCATION,
          );
          return (
            backgroundLocationGranted === PermissionsAndroid.RESULTS.GRANTED
          );
        }
        return true;
      } catch (err) {
        console.warn('Permission request error:', err);
        return false;
      }
    }
    return false;
  };

  useEffect(() => {
    const initPermissions = async () => {
      const allowed = await requestAllPermissions();
      setHasPermissions(allowed);
      if (!allowed) {
        Alert.alert(
          'Permissions Required',
          'This app requires background location access to accurately track your physical workouts.',
        );
      }
    };
    initPermissions();

    return () => {
      cleanupTracking();
    };
  }, []);

  const cleanupTracking = () => {
    if (watchIdRef.current !== null) {
      Geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    BackgroundJob.stop();
  };

  // 2. Calculation logic
  const getMetValue = (speedMps: number): number => {
    const speedKph = speedMps * 3.6;
    if (speedKph < 1.5) return 0;
    if (speedKph < 5.4) return 3.5;
    if (speedKph < 8.0) return 6.0;
    return 10.5;
  };

  // 3. Thread Loop Tasks
  const trackingBgTask = async (): Promise<void> => {
    await new Promise<void>(async resolve => {
      watchIdRef.current = Geolocation.watchPosition(
        position => {
          const currentSpeed = position.coords.speed || 0;
          setSpeed(currentSpeed);

          if (currentSpeed > 0.5) {
            const met = getMetValue(currentSpeed);
            const weight = 75;
            const caloriesBurnedInWindow =
              ((met * 3.5 * weight) / 200) * (2 / 60);

            caloriesRef.current += caloriesBurnedInWindow;
            setCalories(caloriesRef.current);
          }
        },
        error => console.log('GPS Error:', error),
        {
          enableHighAccuracy: true,
          distanceFilter: 1,
          interval: 2000,
          fastestInterval: 1000,
          showsBackgroundLocationIndicator: true,
        },
      );

      while (BackgroundJob.isRunning()) {
        await new Promise(delay => setTimeout(delay, 2000));
      }
      resolve();
    });
  };

  // 4. Lifecycles
  const toggleTracking = async (): Promise<void> => {
    if (isTracking) {
      cleanupTracking();
      setIsTracking(false);
    } else {
      if (!hasPermissions) {
        const retryPermissions = await requestAllPermissions();
        setHasPermissions(retryPermissions);
        if (!retryPermissions) {
          Alert.alert(
            'Error',
            'Cannot start tracking without location permissions.',
          );
          return;
        }
      }

      setIsTracking(true);
      caloriesRef.current = 0;
      durationRef.current = 0;
      setCalories(0);
      setDuration(0);

      // Start duration clock
      timerIntervalRef.current = setInterval(() => {
        durationRef.current += 1;
        setDuration(durationRef.current);
      }, 1000);

      try {
        await BackgroundJob.start(trackingBgTask, backgroundOptions);
      } catch (e) {
        console.error('Background Job Error:', e);
      }
    }
  };

  const formatTime = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  // Dummy mock data for the weekly history bar layout
  const weekDays = [
    { label: 'S', height: 25 },
    { label: 'M', height: 40 },
    { label: 'T', height: 55 },
    { label: 'W', height: 35 },
    { label: 'T', height: 65 },
    { label: 'F', height: 50 },
    { label: 'S', height: 20 },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.header}>LIVE WORKOUT (TSX CLI)</Text>

        {/* --- METRIC INSTRUMENT CLUSTER AREA --- */}
        <View style={styles.instrumentCluster}>
          {/* Left Side Gauge */}
          <View style={styles.sideGaugeContainer}>
            <View style={[styles.semiArc, styles.leftArc]} />
            <Text style={styles.gaugeLabel}>CURRENT</Text>
            <Text style={styles.gaugeLabel}>SPEED</Text>
            <Text style={styles.gaugeValue}>{(speed * 3.6).toFixed(1)}</Text>
            <Text style={styles.gaugeUnit}>km/h</Text>
          </View>

          {/* Central Main Glow Ring */}
          <View style={styles.mainRingOuter}>
            <View style={styles.mainRingMiddle}>
              <View style={styles.mainRingInner}>
                <Text style={styles.mainCalorieNumber}>
                  {calories.toFixed(1)}
                </Text>
                <Text style={styles.mainCalorieLabel}>CALORIES BURNED</Text>
              </View>
            </View>
          </View>

          {/* Right Side Gauge */}
          <View style={styles.sideGaugeContainer}>
            <View style={[styles.semiArc, styles.rightArc]} />
            <Text style={styles.gaugeLabel}>TOTAL</Text>
            <Text style={styles.gaugeLabel}>DURATION</Text>
            <Text style={styles.gaugeValue}>{formatTime(duration)}</Text>
            <Text style={styles.gaugeUnit}>min</Text>
          </View>
        </View>

        {/* --- STYLIZED MAP TRACE BOX --- */}
        <View style={styles.mapContainer}>
          {/* Faux Grid Lines backing the path trace */}
          <View style={styles.mapGridLineV} />
          <View style={styles.mapGridLineH} />
          {/* Faux Neon GPS Vector Path Trace */}
          <View style={styles.mapVectorTrace}>
            <View style={styles.vectorCornerNode} />
          </View>
        </View>

        {/* --- INTERACTIVE ACTION TRIGGER --- */}
        <TouchableOpacity
          activeOpacity={0.8}
          style={[
            styles.actionButton,
            isTracking ? styles.btnStop : styles.btnStart,
          ]}
          onPress={toggleTracking}
        >
          <Text style={styles.actionButtonText}>
            {isTracking ? 'STOP WORKOUT' : 'START WORKOUT'}
          </Text>
          <Text style={styles.runningIcon}>🏃</Text>
        </TouchableOpacity>

        {/* --- RECENT ANALYTICS PANEL --- */}
        <View style={styles.analyticsPanel}>
          <Text style={styles.panelTitle}>RECENT SESSIONS</Text>
          <View style={styles.panelDividerRow}>
            <Text style={styles.subPanelTitle}>Weekly Progress</Text>
            <Text style={styles.todayTargetText}>
              Today's Total: <Text style={styles.whiteHighlight}>320 kcal</Text>
            </Text>
          </View>

          {/* Chart Rendering Container */}
          <View style={styles.chartContainer}>
            {weekDays.map((day, index) => (
              <View key={index} style={styles.chartColumn}>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { height: day.height }]} />
                </View>
                <Text style={styles.dayLabel}>{day.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1d',
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 30,
    paddingHorizontal: 16,
  },
  header: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 3,
    marginTop: 20,
    marginBottom: 25,
  },

  // Instrument Layout
  instrumentCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    marginBottom: 24,
  },
  sideGaugeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 75,
    height: 100,
  },
  semiArc: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  leftArc: {
    borderLeftColor: '#0ea5e9',
    borderTopColor: '#0ea5e9',
    opacity: 0.4,
    transform: [{ rotate: '-45deg' }],
  },
  rightArc: {
    borderRightColor: '#0ea5e9',
    borderTopColor: '#0ea5e9',
    opacity: 0.4,
    transform: [{ rotate: '45deg' }],
  },
  gaugeLabel: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    lineHeight: 11,
  },
  gaugeValue: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 4,
  },
  gaugeUnit: {
    color: '#0ea5e9',
    fontSize: 10,
    fontWeight: '600',
  },

  // Central Ring Stack Structure
  mainRingOuter: {
    width: 185,
    height: 185,
    borderRadius: 92.5,
    borderWidth: 3,
    borderColor: '#0284c7',
    padding: 6,
    marginHorizontal: 10,
    shadowColor: '#0ea5e9',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
  },
  mainRingMiddle: {
    flex: 1,
    borderRadius: 85,
    borderWidth: 1.5,
    borderColor: '#22d3ee',
    padding: 4,
  },
  mainRingInner: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(34, 211, 238, 0.2)',
  },
  mainCalorieNumber: {
    color: '#f8fafc',
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  mainCalorieLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 2,
  },

  // Faux GPS Vectors Display Frame
  mapContainer: {
    width: '100%',
    height: 140,
    backgroundColor: '#111827',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 28,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapGridLineV: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
  },
  mapGridLineH: {
    position: 'absolute',
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(30, 41, 59, 0.5)',
  },
  mapVectorTrace: {
    width: 160,
    height: 70,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#06b6d4',
    borderTopColor: 'transparent',
    transform: [{ rotate: '-15deg' }],
    opacity: 0.85,
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
  },
  vectorCornerNode: {
    position: 'absolute',
    bottom: -4,
    left: 40,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22d3ee',
  },

  // Premium Pill Form Actions
  actionButton: {
    width: '85%',
    paddingVertical: 15,
    borderRadius: 35,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  btnStart: {
    backgroundColor: '#10b981',
  },
  btnStop: {
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  runningIcon: {
    fontSize: 18,
    marginLeft: 8,
    color: '#fff',
  },

  // Analytics Frame
  analyticsPanel: {
    width: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 16,
  },
  panelTitle: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  panelDividerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  subPanelTitle: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '600',
  },
  todayTargetText: {
    color: '#64748b',
    fontSize: 12,
  },
  whiteHighlight: {
    color: '#f8fafc',
    fontWeight: '700',
  },

  // History Grid Bars Display
  chartContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 90,
    paddingHorizontal: 4,
  },
  chartColumn: {
    alignItems: 'center',
    flex: 1,
  },
  barTrack: {
    height: 70,
    width: 14,
    backgroundColor: '#1e293b',
    borderRadius: 6,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: '#06b6d4',
    borderRadius: 6,
  },
  dayLabel: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 6,
  },
});
