import { StyleSheet } from 'react-native'
import { C } from './colors'

export const S = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: C.bg,
  },
  card: {
    backgroundColor: C.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 12,
  },
  input: {
    backgroundColor: C.surface2,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: C.text,
    fontSize: 14,
  },
  btnPrimary: {
    backgroundColor: C.blueDark,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center' as const,
  },
  btnPrimaryText: {
    color: '#020617',
    fontWeight: '700' as const,
    fontSize: 15,
  },
  btnDanger: {
    borderWidth: 1,
    borderColor: '#f87171',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center' as const,
  },
  btnDangerText: {
    color: C.red,
    fontWeight: '600' as const,
    fontSize: 14,
  },
  label: {
    color: C.muted,
    fontSize: 12,
    marginBottom: 4,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  title: {
    color: C.text,
    fontSize: 22,
    fontWeight: '700' as const,
  },
  subtitle: {
    color: C.muted,
    fontSize: 14,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
})
