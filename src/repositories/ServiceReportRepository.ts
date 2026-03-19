import { pool } from '@config/database';
import { AppError } from '@utils/AppError';
import logger from '@config/logger';
import {
  CreateServiceReportDTO,
  UpdateServiceReportDTO,
  ServiceReportFilters,
  ServiceReportSummary
} from '@/dtos/serviceReport.types';

export class ServiceReportRepository {
  async create(churchId: string, userId: string, data: CreateServiceReportDTO): Promise<any> {
    const client = await pool.connect();
    
    try {
      // Get event info
      const eventQuery = `
        SELECT ei.instance_date, e.name as event_name
        FROM event_instances ei
        JOIN events e ON e.id = ei.event_id
        WHERE ei.id = $1 AND ei.church_id = $2
      `;
      const eventResult = await client.query(eventQuery, [data.event_instance_id, churchId]);
      
      if (eventResult.rows.length === 0) {
        throw new AppError('Event instance not found', 404);
      }

      const eventInfo = eventResult.rows[0];
      const totalAttendance = data.attendance_men + data.attendance_women + data.attendance_children;
      const totalIncome = data.offerings + data.tithes + data.donations + (data.other_income || 0);
      const netIncome = totalIncome - data.expenses;

      const query = `
        INSERT INTO service_reports (
          church_id, event_instance_id, event_name, service_date,
          preacher, sermon_title, sermon_notes,
          attendance_men, attendance_women, attendance_children, total_attendance,
          first_timers, new_comers,
          offerings, tithes, donations, other_income, total_income, expenses, net_income,
          cash_amount, bank_transfer_amount, card_amount, mobile_money_amount,
          notes, recorded_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26
        )
        RETURNING *
      `;

      const values = [
        churchId,
        data.event_instance_id,
        eventInfo.event_name,
        eventInfo.instance_date,
        data.preacher || null,
        data.sermon_title || null,
        data.sermon_notes || null,
        data.attendance_men,
        data.attendance_women,
        data.attendance_children,
        totalAttendance,
        data.first_timers,
        data.new_comers,
        data.offerings,
        data.tithes,
        data.donations,
        data.other_income || 0,
        totalIncome,
        data.expenses,
        netIncome,
        data.cash_amount,
        data.bank_transfer_amount,
        data.card_amount,
        data.mobile_money_amount || 0,
        data.notes || null,
        userId
      ];

      const result = await client.query(query, values);
      return result.rows[0];
    } catch (error) {
      if (error instanceof AppError) throw error;
      logger.error('Error in ServiceReportRepository.create:', error);
      throw new AppError('Failed to create service report', 500);
    } finally {
      client.release();
    }
  }

  async findAll(churchId: string, filters: ServiceReportFilters = {}): Promise<any[]> {
    const client = await pool.connect();
    
    try {
      let query = `
        SELECT sr.*,
          u.first_name as recorded_by_name,
          e.name as event_type_name,
          ei.event_id
        FROM service_reports sr
        LEFT JOIN users u ON u.id = sr.recorded_by
        LEFT JOIN event_instances ei ON ei.id = sr.event_instance_id
        LEFT JOIN events e ON e.id = ei.event_id
        WHERE sr.church_id = $1
      `;
      
      const values: any[] = [churchId];
      let paramCount = 2;

      if (filters.start_date) {
        query += ` AND sr.service_date >= $${paramCount}`;
        values.push(filters.start_date);
        paramCount++;
      }

      if (filters.end_date) {
        query += ` AND sr.service_date <= $${paramCount}`;
        values.push(filters.end_date);
        paramCount++;
      }

      if (filters.event_id) {
        query += ` AND ei.event_id = $${paramCount}`;
        values.push(filters.event_id);
        paramCount++;
      }

      if (filters.preacher) {
        query += ` AND sr.preacher ILIKE $${paramCount}`;
        values.push(`%${filters.preacher}%`);
        paramCount++;
      }

      query += ' ORDER BY sr.service_date DESC, sr.created_at DESC';

      const result = await client.query(query, values);
      return result.rows;
    } catch (error) {
      logger.error('Error in ServiceReportRepository.findAll:', error);
      throw new AppError('Failed to fetch service reports', 500);
    } finally {
      client.release();
    }
  }

  async findById(churchId: string, reportId: string): Promise<any> {
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT sr.*,
          u.first_name as recorded_by_name,
          e.name as event_type_name
        FROM service_reports sr
        LEFT JOIN users u ON u.id = sr.recorded_by
        LEFT JOIN event_instances ei ON ei.id = sr.event_instance_id
        LEFT JOIN events e ON e.id = ei.event_id
        WHERE sr.id = $1 AND sr.church_id = $2
      `;
      
      const result = await client.query(query, [reportId, churchId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Error in ServiceReportRepository.findById:', error);
      throw new AppError('Failed to fetch service report', 500);
    } finally {
      client.release();
    }
  }

  async update(churchId: string, reportId: string, data: UpdateServiceReportDTO): Promise<any> {
    const client = await pool.connect();
    
    try {
      const updates: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      // Calculate totals if attendance/financial fields are updated
      if (data.attendance_men !== undefined || data.attendance_women !== undefined || data.attendance_children !== undefined) {
        const current = await this.findById(churchId, reportId);
        const men = data.attendance_men ?? current.attendance_men;
        const women = data.attendance_women ?? current.attendance_women;
        const children = data.attendance_children ?? current.attendance_children;
        updates.push(`total_attendance = $${paramCount}`);
        values.push(men + women + children);
        paramCount++;
      }

      if (data.offerings !== undefined || data.tithes !== undefined || data.donations !== undefined) {
        const current = await this.findById(churchId, reportId);
        const offerings = data.offerings ?? current.offerings;
        const tithes = data.tithes ?? current.tithes;
        const donations = data.donations ?? current.donations;
        const otherIncome = data.other_income ?? current.other_income;
        const expenses = data.expenses ?? current.expenses;
        const totalIncome = offerings + tithes + donations + otherIncome;
        
        updates.push(`total_income = $${paramCount}`);
        values.push(totalIncome);
        paramCount++;
        
        updates.push(`net_income = $${paramCount}`);
        values.push(totalIncome - expenses);
        paramCount++;
      }

      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          updates.push(`${this.camelToSnake(key)} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      });

      if (updates.length === 0) {
        return this.findById(churchId, reportId);
      }

      updates.push(`updated_at = NOW()`);
      values.push(reportId, churchId);

      const query = `
        UPDATE service_reports 
        SET ${updates.join(', ')} 
        WHERE id = $${paramCount} AND church_id = $${paramCount + 1}
        RETURNING *
      `;

      const result = await client.query(query, values);
      return result.rows[0];
    } catch (error) {
      logger.error('Error in ServiceReportRepository.update:', error);
      throw new AppError('Failed to update service report', 500);
    } finally {
      client.release();
    }
  }

  async delete(churchId: string, reportId: string): Promise<void> {
    const client = await pool.connect();
    
    try {
      const query = `DELETE FROM service_reports WHERE id = $1 AND church_id = $2`;
      await client.query(query, [reportId, churchId]);
    } catch (error) {
      logger.error('Error in ServiceReportRepository.delete:', error);
      throw new AppError('Failed to delete service report', 500);
    } finally {
      client.release();
    }
  }

  async getSummary(churchId: string, startDate?: string, endDate?: string): Promise<ServiceReportSummary> {
    const client = await pool.connect();
    
    try {
      let dateFilter = '';
      const values: any[] = [churchId];
      
      if (startDate && endDate) {
        dateFilter = 'AND service_date BETWEEN $2 AND $3';
        values.push(startDate, endDate);
      }

      const query = `
        SELECT 
          COUNT(*) as total_reports,
          COALESCE(AVG(total_attendance), 0) as average_attendance,
          COALESCE(SUM(total_income), 0) as total_income,
          COALESCE(SUM(first_timers), 0) as total_first_timers,
          COALESCE(AVG(attendance_men), 0) as average_men,
          COALESCE(AVG(attendance_women), 0) as average_women,
          COALESCE(AVG(attendance_children), 0) as average_children
        FROM service_reports
        WHERE church_id = $1 ${dateFilter}
      `;

      const result = await client.query(query, values);
      const row = result.rows[0];

      return {
        total_reports: parseInt(row.total_reports),
        average_attendance: Math.round(parseFloat(row.average_attendance)),
        total_income: parseFloat(row.total_income),
        total_first_timers: parseInt(row.total_first_timers),
        average_men: Math.round(parseFloat(row.average_men)),
        average_women: Math.round(parseFloat(row.average_women)),
        average_children: Math.round(parseFloat(row.average_children))
      };
    } catch (error) {
      logger.error('Error in ServiceReportRepository.getSummary:', error);
      throw new AppError('Failed to fetch service report summary', 500);
    } finally {
      client.release();
    }
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}
