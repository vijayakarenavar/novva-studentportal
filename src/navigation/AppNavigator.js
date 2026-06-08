import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View, Text, Platform } from "react-native";
import { useAuth } from "../context/AuthContext";

// ✅ Screen imports
import LoginScreen from "../screens/auth/LoginScreen";
import ForgotPasswordScreen from "../screens/auth/ForgotPasswordScreen";
import HomeScreen from "../screens/home/HomeScreen";
import TimetableScreen from "../screens/timetable/TimetableScreen";
import NotificationsScreen from "../screens/notifications/NotificationsScreen";
import ProfileScreen from "../screens/profile/ProfileScreen";
import AttendanceScreen from "../screens/attendance/AttendanceScreen";
import FeesScreen from "../screens/fees/StudentFees";
import EditProfileScreen from "../screens/profile/EditProfileScreen";
import MakePaymentScreen from "../screens/fees/MakePayment"; // ✅ ADDED
import PaymentSuccessScreen from "../screens/fees/PaymentSuccess"; // ✅ ADDED
import PaymentCancelScreen from "../screens/fees/PaymentCancel"; // ✅ ADDED
import FeeReceiptScreen from "../screens/fees/FeeReceipt"; // ✅ ADDED

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ✅ Tab Icon Component
const TabIcon = ({ icon, label, focused }) => (
  <View
    style={{ alignItems: "center", justifyContent: "center", paddingTop: 6 }}
  >
    <Text style={{ fontSize: 22, marginBottom: 2 }}>{icon}</Text>
    <Text
      style={{
        fontSize: 10,
        fontWeight: focused ? "700" : "500",
        color: focused ? "#1a4b6d" : "#94a3b8",
      }}
    >
      {label}
    </Text>
    {focused && (
      <View
        style={{
          width: 4,
          height: 4,
          borderRadius: 2,
          backgroundColor: "#1a4b6d",
          marginTop: 2,
        }}
      />
    )}
  </View>
);

// ✅ Tab Navigator
const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: "#ffffff",
          borderTopWidth: 1,
          borderTopColor: "#e2e8f0",
          height: 65,
          paddingBottom: 8,
          ...(Platform.OS === "web"
            ? { boxShadow: "0px -2px 10px rgba(0,0,0,0.05)" }
            : {
                shadowColor: "#000",
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.05,
                shadowRadius: 4,
                elevation: 3,
              }),
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="🏠" label="Home" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Timetable"
        component={TimetableScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="📅" label="Timetable" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="👤" label="Profile" focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// ✅ Main App Navigator
const AppNavigator = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#f1f5f9",
        }}
      >
        <Text style={{ fontSize: 40 }}>🎓</Text>
        <Text style={{ color: "#64748b", marginTop: 8, fontSize: 14 }}>
          Loading...
        </Text>
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="Main" component={TabNavigator} />
          <Stack.Screen
            name="Attendance"
            component={AttendanceScreen}
            options={{ presentation: "card" }}
          />
          <Stack.Screen
            name="Fees"
            component={FeesScreen}
            options={{ presentation: "card" }}
          />
          <Stack.Screen
            name="EditProfile"
            component={EditProfileScreen}
            options={{ presentation: "card" }}
          />
          <Stack.Screen
            name="Notifications"
            component={NotificationsScreen}
            options={{ presentation: "card" }}
          />

          {/* ✅ Payment Screens */}
          <Stack.Screen
            name="MakePayment"
            component={MakePaymentScreen}
            options={{ presentation: "card" }}
          />
          <Stack.Screen
            name="PaymentSuccess"
            component={PaymentSuccessScreen}
            options={{ presentation: "card", gestureEnabled: false }}
          />
          <Stack.Screen
            name="PaymentCancel"
            component={PaymentCancelScreen}
            options={{ presentation: "card" }}
          />
          <Stack.Screen
            name="FeeReceipt"
            component={FeeReceiptScreen}
            options={{ presentation: "card" }}
          />
        </>
      ) : (
        <>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen
            name="ForgotPassword"
            component={ForgotPasswordScreen}
            options={{ presentation: "card" }}
          />
        </>
      )}
    </Stack.Navigator>
  );
};

export default AppNavigator;
