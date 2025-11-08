import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Platform } from "react-native";
import DrawerNavigator from "./src/navigation/TabNavigator";
import { WebContainer } from "./src/components/WebContainer";
import { AsyncJobProvider } from "./src/context/AsyncJobContext";

/*
IMPORTANT NOTICE: DO NOT REMOVE
There are already environment keys in the project. 
Before telling the user to add them, check if you already have access to the required keys through bash.
Directly access them with process.env.${key}

Correct usage:
process.env.EXPO_PUBLIC_{key}
//directly access the key

Incorrect usage:
import { OPENAI_API_KEY } from '@env';
//don't use @env, it's deprecated

Incorrect usage:
import Constants from 'expo-constants';
const openai_api_key = Constants.expoConfig.extra.apikey;
//don't use expo-constants, it's deprecated

*/

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AsyncJobProvider>
          <WebContainer>
            <NavigationContainer>
              <DrawerNavigator />
              <StatusBar style="dark" />
            </NavigationContainer>
          </WebContainer>
        </AsyncJobProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
