import { Stack } from 'expo-router'
import { C } from '../../../src/constants/colors'

export default function WorkoutsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
    </Stack>
  )
}
