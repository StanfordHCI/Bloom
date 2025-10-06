import React from 'react';
import { createStackNavigator, StackNavigationProp } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import SignIn from '../components/auth/SignIn';
import SignUp from '../components/auth/SignUp';

export type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
};

export type AuthNavigationProp = StackNavigationProp<AuthStackParamList, 'SignIn', 'SignUp'>;

const Stack = createStackNavigator<AuthStackParamList>();

const doNothing: () => Promise<void> = async () => {};

const AuthStack = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        presentation: 'modal',
      }}
    >
      <Stack.Screen name="SignIn">
        {({ navigation }: { navigation: AuthNavigationProp }) => (
          <SignIn 
            navigateSignUp={() => navigation.navigate('SignUp')}
            completeStep={doNothing}
          />
        )}
      </Stack.Screen>
      <Stack.Screen name="SignUp">
        {({ navigation }: { navigation: StackNavigationProp<AuthStackParamList, 'SignUp'> }) => (
          <SignUp
            navigateSignIn={() => navigation.navigate('SignIn')}
            completeStep={doNothing}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

export default function AuthModal() {
  return (
    <NavigationContainer>
      <AuthStack />
    </NavigationContainer>
  );
}
