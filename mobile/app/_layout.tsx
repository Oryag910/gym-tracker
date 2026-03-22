import { Redirect, Slot, Stack } from 'expo-router'
import { useAuth, AuthProvider } from '../src/context/AuthContext'
import { View } from 'react-native'
import { C } from '../src/constants/colors'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

function RootLayoutInner() {
  const { isAuthenticated, initialized } = useAuth()

  if (!initialized) {
    return <View style={{ flex: 1, backgroundColor: C.bg }} />
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  )
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <RootLayoutInner />
      </AuthProvider>
    </GestureHandlerRootView>
  )
}
