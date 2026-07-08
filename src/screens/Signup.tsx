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
  ScrollView,
} from 'react-native'
import { useAuth, apiSignup } from '../context/AuthContext'
import { theme } from '../styles/theme'

const copy = {
  en: {
    title: 'Create account',
    name: 'Full name',
    email: 'Email',
    password: 'Password (min 8 chars)',
    business: 'Business name',
    submit: 'Create account',
    hasAccount: 'Already have an account?',
    login: 'Log in',
    errorRequired: 'All fields are required',
    errorShortPw: 'Password must be at least 8 characters',
    errorServer: 'Could not create account. Try a different email.',
  },
  es: {
    title: 'Crear cuenta',
    name: 'Nombre completo',
    email: 'Correo electrónico',
    password: 'Contraseña (mínimo 8 caracteres)',
    business: 'Nombre del negocio',
    submit: 'Crear cuenta',
    hasAccount: '¿Ya tienes cuenta?',
    login: 'Entrar',
    errorRequired: 'Todos los campos son obligatorios',
    errorShortPw: 'La contraseña debe tener al menos 8 caracteres',
    errorServer: 'No se pudo crear la cuenta. Intenta con otro correo.',
  },
}

type Props = {
  language: 'en' | 'es'
  onLogin: () => void
}

export default function SignupScreen({ language, onLogin }: Props) {
  const t = copy[language]
  const { login } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [business, setBusiness] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !password || !business.trim()) {
      setError(t.errorRequired)
      return
    }
    if (password.length < 8) {
      setError(t.errorShortPw)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await apiSignup(name.trim(), email.trim().toLowerCase(), password, business.trim())
      await login(res.token, res.user, res.tenant)
    } catch {
      setError(t.errorServer)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>{t.title}</Text>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TextInput
            style={styles.input}
            placeholder={t.name}
            placeholderTextColor={theme.textMuted}
            value={name}
            onChangeText={setName}
            autoComplete="name"
          />
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
            autoComplete="new-password"
          />
          <TextInput
            style={styles.input}
            placeholder={t.business}
            placeholderTextColor={theme.textMuted}
            value={business}
            onChangeText={setBusiness}
            autoCapitalize="words"
          />

          <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{t.submit}</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t.hasAccount} </Text>
            <TouchableOpacity onPress={onLogin}>
              <Text style={styles.link}>{t.login}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
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
