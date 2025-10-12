import { supabase } from '@/integrations/supabase/client'
import type { AppRole } from '@/integrations/supabase/types'

export interface SignUpData {
  email: string
  password: string
  fullName?: string
}

export interface SignInData {
  email: string
  password: string
}

export class AuthService {
  /**
   * Sign up a new user
   */
  static async signUp({ email, password, fullName }: SignUpData) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    if (error) throw error
    return data
  }

  /**
   * Sign in an existing user
   */
  static async signIn({ email, password }: SignInData) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) throw error
    return data
  }

  /**
   * Sign out the current user
   */
  static async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  /**
   * Get the current user
   */
  static async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error) throw error
    return user
  }

  /**
   * Get the current session
   */
  static async getCurrentSession() {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error) throw error
    return session
  }

  /**
   * Check if user has a specific role
   */
  static async hasRole(role: AppRole, userId?: string) {
    const { data, error } = await supabase.rpc('has_role', {
      _user_id: userId || (await this.getCurrentUser())?.id,
      _role: role,
    })

    if (error) throw error
    return data
  }

  /**
   * Get user profile with roles
   */
  static async getUserProfile(userId?: string) {
    const targetUserId = userId || (await this.getCurrentUser())?.id
    if (!targetUserId) return null

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', targetUserId)
      .single()

    if (profileError) throw profileError

    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', targetUserId)

    if (rolesError) throw rolesError

    return {
      ...profile,
      roles: roles.map(r => r.role),
      is_admin: roles.some(r => r.role === 'admin')
    }
  }

  /**
   * Update user profile
   */
  static async updateProfile(updates: { full_name?: string; email?: string }) {
    const user = await this.getCurrentUser()
    if (!user) throw new Error('No authenticated user')

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Reset password
   */
  static async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) throw error
  }

  /**
   * Update password
   */
  static async updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) throw error
  }


}