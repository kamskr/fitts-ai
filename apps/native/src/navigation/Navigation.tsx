import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "@clerk/expo";
import { useConvexAuth } from "convex/react";
import LoginScreen from "../screens/LoginScreen";
import NotesDashboardScreen from "../screens/NotesDashboardScreen";
import InsideNoteScreen from "../screens/InsideNoteScreen";
import CreateNoteScreen from "../screens/CreateNoteScreen";

const Stack = createNativeStackNavigator();

const Navigation = () => {
  const { isLoaded, isSignedIn } = useAuth();
  const { isLoading: isConvexAuthLoading } = useConvexAuth();

  if (!isLoaded || (isSignedIn && isConvexAuthLoading)) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color="#0D87E1" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator id={undefined} screenOptions={{ headerShown: false }}>
        {isSignedIn ? (
          <>
            <Stack.Screen
              name="NotesDashboardScreen"
              component={NotesDashboardScreen}
            />
            <Stack.Screen
              name="InsideNoteScreen"
              component={InsideNoteScreen}
            />
            <Stack.Screen
              name="CreateNoteScreen"
              component={CreateNoteScreen}
            />
          </>
        ) : (
          <Stack.Screen name="LoginScreen" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
});

export default Navigation;
