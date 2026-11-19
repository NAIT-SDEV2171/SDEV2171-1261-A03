import { Stack } from 'expo-router';
import { AuthProvider } from '../context/AuthContext';
import { StudyPlanProvider } from '../context/StudyPlanContext';


// this way of doing things would necessitate me calling useAuth() in every single page component,
// or hook that needed to fetch from authed server/endpoint
export default function Layout() {
  return (
    <AuthProvider>
      <StudyPlanProvider>
        <Stack>
          <Stack.Screen name="index" options={{ title: 'Home' }} />
          <Stack.Screen name="details" options={{ title: 'Study Steps' }} />
          <Stack.Screen name="plan" options={{ title: 'Plan' }} />
          <Stack.Screen name="session-form" options={{ title: 'Save Session' }} />
        </Stack>
      </StudyPlanProvider>
    </AuthProvider>
  );
}
