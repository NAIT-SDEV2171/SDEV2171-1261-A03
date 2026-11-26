import { Stack } from 'expo-router';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { StudyPlanProvider } from '../context/StudyPlanContext';

export default function Layout() {
  return (
    <AuthProvider>
      <StudyPlanProvider>
        <RootNavigator />
      </StudyPlanProvider>
    </AuthProvider>
  );
}

// A separate component, so it renders inside AuthProvider and can call useAuth.
function RootNavigator() {
  const { isSignedIn } = useAuth();

  return (
    <Stack>
      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen name="index" options={{ title: 'Home' }} />
        <Stack.Screen name="details" options={{ title: 'Study Steps' }} />
        <Stack.Screen name="plan" options={{ title: 'Plan' }} />
        <Stack.Screen name="session-form" options={{ title: 'Save Session' }} />
      </Stack.Protected>

      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="login" options={{ title: 'Sign In' }} />
      </Stack.Protected>
    </Stack>
  );
}
