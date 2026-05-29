# Live Workout Calorie Tracker 🏃🔥

A high-fidelity, premium real-time fitness tracking application built with **React Native CLI** and **TypeScript**. This app utilizes native device hardware sensors and high-accuracy background geolocation to dynamically calculate physical activity metrics and metabolic calorie expenditure on the fly.

---

## 🚀 Key Features

- **Real-Time MET Calculation:** Maps precise GPS movement speeds directly to Metabolic Equivalent of Task (MET) equations to accurately calculate real-time calorie burn windows.
- **Persistent Background Processing:** Integrated native foreground services to ensure data calculations and workout states continue processing seamlessly even when the user locks their screen or places their phone in their pocket.
- **Premium Dashboard UI:** A highly responsive, custom-layered dark mode user interface featuring instrument style gauges for speed/duration tracking and embedded weekly visual progress charts.
- **Immediate Permission Pipeline:** A sequenced lifecycle routine designed to cleanly request device foreground and background fine location requirements simultaneously upon application launch.

---

## 🛠️ Tech Stack & Architecture

- **Framework:** React Native CLI (Bare Workflow)
- **Language:** TypeScript (Strict Type Safety)
- **Location Processing:** `react-native-geolocation-service`
- **Background Architecture:** `react-native-background-actions`

---

## 📦 Getting Started

> **Note**: Make sure you have completed the official React Native [Environment Setup](https://reactnative.dev/docs/set-up-your-environment) guide for CLI configurations before proceeding.

### 1. Installation

Clone the repository and install the required dependencies:

```sh
git clone [https://github.com/coyot1904/liveWorkOut.git](https://github.com/coyot1904/liveWorkOut.git)
cd liveWorkOut
npm install
```

---

### 2. Native Setup & Configurations

Android Permissions
Ensure the following lines are configured inside your android/app/src/main/AndroidManifest.xml to allow background location hooks:

```sh
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />

<application ...>
    <service android:name="com.asterinet.reactnativebackgroundactions.RNBackgroundActionsTask" />
</application>
```

iOS Permissions & Pods
Install the required iOS cocoapods by navigating to the ios directory:

```sh
cd ios
bundle install
bundle exec pod install
cd ..
```

---

### 3. Run the Application

For Android:

```sh
npm run android
```

For iOS:

```sh
npm run ios
```

---

### 4. How Calorie Calculations Work

The tracking module processes movement updates roughly every 2 seconds and maps incoming velocity changes to exercise physics using the standard MET formula:

$$\text{Calories Burned per Minute} = \frac{\text{MET} \times 3.5 \times \text{Weight in kg}}{200}$$

The active MET coefficients dynamically shift based on the user's current speed threshold:

- **Stationary / Stopped:** 0.0 MET (< 1.5 km/h)
- **Walking:** 3.5 MET (1.5 km/h to 5.3 km/h)
- **Jogging:** 6.0 MET (5.4 km/h to 7.9 km/h)
- **Running:** 10.5 MET (≥ 8.0 km/h)
