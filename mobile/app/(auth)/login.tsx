import { useState } from 'react'
import {
  View, Text, TextInput, Pressable, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView, StyleSheet
} from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '../../src/context/AuthContext'
import * as authApi from '../../src/api/auth'
import { C } from '../../src/constants/colors'
import { S } from '../../src/constants/styles'

export default function LoginScreen() {
  const { login } = useAuth()
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handle = async () => {
    setError('')
    setLoading(true)
    try {
      if (tab === 'register') {
        await authApi.register(username, email, password)
      }
      const res = await authApi.login(username, password)
      await login(res.data.access_token)
      router.replace('/(tabs)')
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: C.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={ls.container} keyboardShouldPersistTaps="handled">
        <Text style={ls.logo}>GymTracker</Text>
        <Text style={ls.tagline}>Track your gains</Text>

        {/* Tab toggle */}
        <View style={ls.tabRow}>
          <Pressable style={[ls.tab, tab === 'login' && ls.tabActive]} onPress={() => setTab('login')}>
            <Text style={[ls.tabText, tab === 'login' && ls.tabTextActive]}>Sign In</Text>
          </Pressable>
          <Pressable style={[ls.tab, tab === 'register' && ls.tabActive]} onPress={() => setTab('register')}>
            <Text style={[ls.tabText, tab === 'register' && ls.tabTextActive]}>Register</Text>
          </Pressable>
        </View>

        {/* Form */}
        <View style={ls.form}>
          <Text style={S.label}>Username</Text>
          <TextInput
            style={[S.input, { marginBottom: 16 }]}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor={C.muted}
            placeholder="your_username"
          />

          {tab === 'register' && (
            <>
              <Text style={S.label}>Email</Text>
              <TextInput
                style={[S.input, { marginBottom: 16 }]}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholderTextColor={C.muted}
                placeholder="you@example.com"
              />
            </>
          )}

          <Text style={S.label}>Password</Text>
          <TextInput
            style={[S.input, { marginBottom: 24 }]}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor={C.muted}
            placeholder="••••••••"
          />

          {error ? <Text style={ls.error}>{error}</Text> : null}

          <Pressable style={S.btnPrimary} onPress={handle} disabled={loading}>
            {loading
              ? <ActivityIndicator color={C.bg} />
              : <Text style={S.btnPrimaryText}>{tab === 'login' ? 'Sign In' : 'Create Account'}</Text>
            }
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const ls = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logo: {
    fontSize: 32,
    fontWeight: '800',
    color: C.blue,
    textAlign: 'center',
    marginBottom: 4,
  },
  tagline: {
    color: C.muted,
    textAlign: 'center',
    marginBottom: 40,
    fontSize: 15,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: C.surface,
    borderRadius: 10,
    padding: 4,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: C.blueDark,
  },
  tabText: {
    color: C.muted,
    fontWeight: '600',
    fontSize: 14,
  },
  tabTextActive: {
    color: '#020617',
  },
  form: {
    gap: 0,
  },
  error: {
    color: C.red,
    marginBottom: 12,
    fontSize: 13,
  },
})
