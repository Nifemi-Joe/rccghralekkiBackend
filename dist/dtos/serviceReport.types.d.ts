export interface ServiceReport {
    id: string;
    church_id: string;
    event_instance_id: string;
    event_name: string;
    service_date: Date;
    preacher?: string;
    sermon_title?: string;
    sermon_notes?: string;
    attendance_men: number;
    attendance_women: number;
    attendance_children: number;
    total_attendance: number;
    first_timers: number;
    new_comers: number;
    offerings: number;
    tithes: number;
    donations: number;
    other_income: number;
    total_income: number;
    expenses: number;
    net_income: number;
    cash_amount: number;
    bank_transfer_amount: number;
    card_amount: number;
    mobile_money_amount: number;
    notes?: string;
    recorded_by: string;
    created_at: Date;
    updated_at: Date;
}
export interface CreateServiceReportDTO {
    event_instance_id: string;
    preacher?: string;
    sermon_title?: string;
    sermon_notes?: string;
    attendance_men: number;
    attendance_women: number;
    attendance_children: number;
    first_timers: number;
    new_comers: number;
    offerings: number;
    tithes: number;
    donations: number;
    other_income?: number;
    expenses: number;
    cash_amount: number;
    bank_transfer_amount: number;
    card_amount: number;
    mobile_money_amount?: number;
    notes?: string;
}
export interface UpdateServiceReportDTO extends Partial<CreateServiceReportDTO> {
}
export interface ServiceReportFilters {
    start_date?: string;
    end_date?: string;
    event_id?: string;
    preacher?: string;
}
export interface ServiceReportSummary {
    total_reports: number;
    average_attendance: number;
    total_income: number;
    total_first_timers: number;
    average_men: number;
    average_women: number;
    average_children: number;
}
//# sourceMappingURL=serviceReport.types.d.ts.map