import { View, Pressable, Text, StyleSheet, Platform } from 'react-native'
import { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { C } from '../constants/colors'

const ICONS: Record<string, string> = {
  index: '⌂',
  workouts: '≡',
  log: '+',
  prs: '★',
  analytics: '▲',
}

const LABELS: Record<string, string> = {
  index: 'Home',
  workouts: 'Workouts',
  log: 'Log',
  prs: 'PRs',
  analytics: 'Stats',
}

export default function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  return (
    <View style={tb.container}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index
        const isLog = route.name === 'log'

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true })
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name)
        }

        if (isLog) {
          return (
            <Pressable key={route.key} onPress={onPress} style={tb.logBtn}>
              <View style={tb.logCircle}>
                <Text style={tb.logIcon}>+</Text>
              </View>
            </Pressable>
          )
        }

        return (
          <Pressable key={route.key} onPress={onPress} style={tb.tab}>
            <Text style={[tb.icon, isFocused && tb.iconActive]}>{ICONS[route.name]}</Text>
            <Text style={[tb.label, isFocused && tb.labelActive]}>{LABELS[route.name]}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const tb = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    paddingTop: 8,
    paddingHorizontal: 8,
    alignItems: 'flex-end',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  icon: {
    fontSize: 20,
    color: C.muted,
    marginBottom: 2,
  },
  iconActive: {
    color: C.blue,
  },
  label: {
    fontSize: 10,
    color: C.muted,
  },
  labelActive: {
    color: C.blue,
  },
  logBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 4,
  },
  logCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: C.blueDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: -4,
    shadowColor: C.blue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  logIcon: {
    color: '#020617',
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 32,
  },
})
