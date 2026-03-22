import { Tabs, Redirect } from 'expo-router'
import { useAuth } from '../../src/context/AuthContext'
import TabBar from '../../src/components/TabBar'

export default function TabsLayout() {
  const { isAuthenticated, initialized } = useAuth()
  if (initialized && !isAuthenticated) return <Redirect href="/(auth)/login" />

  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="workouts" />
      <Tabs.Screen name="log" />
      <Tabs.Screen name="prs" />
      <Tabs.Screen name="analytics" />
    </Tabs>
  )
}
