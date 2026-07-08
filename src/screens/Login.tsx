import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native'
import { useAuth, apiLogin } from '../context/AuthContext'
import { theme } from '../styles/theme'

const copy = {
  en: {
    title: 'Welcome back',
    email: 'Email',
    password: 'Password',
    submit: 'Log in',
    noAccount: "Don't have an account?",
    signup: 'Sign up',
    error: 'Invalid email or password',
  },
  es: {
    title: 'Bienvenido de nuevo',
    email: 'Correo electrónico',
    password: 'Contraseña',
    submit: 'Entrar',
    noAccount: '¿No tienes cuenta?',
    signup: 'Regístrate',
    error: 'Correo o contraseña incorrectos',
  },
}

type Props = {
  language: 'en' | 'es'
  onSignup: () => void
}

export default function LoginScreen({ language, onSignup }: Props) {
  const t = copy[language]
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!email.trim() || !password) return
    setLoading(true)
    setError(null)
    try {
      const res = await apiLogin(email.trim().toLowerCase(), password)
      await login(res.token, res.user, res.tenant)
    } catch {
      setError(t.error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>{t.title}</Text>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          placeholder={t.email}
          placeholderTextColor={theme.textMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
        <TextInput
          style={styles.input}
          placeholder={t.password}
          placeholderTextColor={theme.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
        />

        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{t.submit}</Text>
          )}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{t.noAccount} </Text>
          <TouchableOpacity onPress={onSignup}>
            <Text style={styles.link}>{t.signup}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', backgroundColor: theme.background, padding: 24 },
  card: { backgroundColor: theme.surface, borderRadius: 16, padding: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: '700', color: theme.text, marginBottom: 4 },
  error: { color: theme.red, fontSize: 14 },
  input: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    padding: 12,
    color: theme.text,
    fontSize: 16,
    backgroundColor: theme.background,
  },
  button: {
    backgroundColor: theme.green,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 8 },
  footerText: { color: theme.textMuted },
  link: { color: theme.green, fontWeight: '600' },
})
