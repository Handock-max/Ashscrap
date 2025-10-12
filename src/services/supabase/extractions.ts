import { supabase } from '@/integrations/supabase/client'
import type { 
  Extraction, 
  ExtractionInsert, 
  ExtractionUpdate, 
  ExtractionStatus
} from '@/integrations/supabase/types'

export interface CreateExtractionData {
  country: string
  companyType: string
  companyAge: string
  fileFormat: string
}

export interface ExtractionFilters {
  status?: ExtractionStatus
  country?: string
  dateFrom?: string
  dateTo?: string
  limit?: number
  offset?: number
}

export class ExtractionsService {
  /**
   * Create a new extraction
   */
  static async createExtraction(data: CreateExtractionData): Promise<Extraction> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    const extractionData: ExtractionInsert = {
      user_id: user.id,
      country: data.country,
      company_type: data.companyType,
      company_age: data.companyAge,
      file_format: data.fileFormat,
      status: 'pending',
    }

    const { data: extraction, error } = await supabase
      .from('extractions')
      .insert(extractionData)
      .select()
      .single()

    if (error) throw error
    return extraction
  }

  /**
   * Get user's extractions with optional filters
   */
  static async getUserExtractions(filters: ExtractionFilters = {}): Promise<Extraction[]> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not authenticated')

    let query = supabase
      .from('extractions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.country) {
      query = query.eq('country', filters.country)
    }

    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom)
    }

    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo)
    }

    if (filters.limit) {
      query = query.limit(filters.limit)
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  }

  /**
   * Get all extractions (admin only)
   */
  static async getAllExtractions(filters: ExtractionFilters = {}): Promise<Extraction[]> {
    let query = supabase
      .from('extractions')
      .select(`
        *,
        profiles!inner(email, full_name)
      `)
      .order('created_at', { ascending: false })

    if (filters.status) {
      query = query.eq('status', filters.status)
    }

    if (filters.country) {
      query = query.eq('country', filters.country)
    }

    if (filters.dateFrom) {
      query = query.gte('created_at', filters.dateFrom)
    }

    if (filters.dateTo) {
      query = query.lte('created_at', filters.dateTo)
    }

    if (filters.limit) {
      query = query.limit(filters.limit)
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  }

  /**
   * Update extraction status
   */
  static async updateExtractionStatus(
    id: string, 
    status: ExtractionStatus, 
    updates: Partial<ExtractionUpdate> = {}
  ): Promise<Extraction> {
    const updateData: ExtractionUpdate = {
      status,
      ...updates,
    }

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('extractions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Delete extraction
   */
  static async deleteExtraction(id: string): Promise<void> {
    const { error } = await supabase
      .from('extractions')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  /**
   * Get extraction by ID
   */
  static async getExtractionById(id: string): Promise<Extraction | null> {
    const { data, error } = await supabase
      .from('extractions')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null // Not found
      throw error
    }
    return data
  }


}