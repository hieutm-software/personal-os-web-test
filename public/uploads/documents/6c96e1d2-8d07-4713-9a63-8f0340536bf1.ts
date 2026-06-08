import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { LeaveRegistrationRoutingModule } from './leave-registration-routing.module';
import { LeaveApplicationComponent } from './leave-application/leave-application.component';
import { NavigationEnd, Router } from '@angular/router';
import { LeaveApplicationTypeComponent } from './leave-application-type/leave-application-type.component';
import { ApprovalRoleComponent } from './approval-role/approval-role.component';
import { LeaveApplicationTypeEditPopupComponent } from './leave-application-type/leave-application-type-edit-popup/leave-application-type-edit-popup.component';
import { ApprovalRoleEditPopupComponent } from './approval-role/approval-role-edit-popup/approval-role-edit-popup.component';
import { ApprovalRoleServiceProxy, BlockDepartmentServiceProxy, CommonServiceServiceProxy, EmployeeAnnualLeaveServiceProxy, EmployeeInfoServiceProxy, LeaveApplicationConfigServiceProxy, LeaveApplicationLogServiceProxy, LeaveApplicationReasonServiceProxy, LeaveApplicationServiceProxy, LeaveApplicationTypeServiceProxy, LeaveApprovalAuthorizationServiceProxy, MobileTokenServiceProxy } from '@shared/service-proxies/service-proxies';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AppCommonModule } from '@app/shared/common/app-common.module';
import { UtilsModule } from '@shared/utils/utils.module';
import { DevExtremeModule, DxTemplateModule, DxToolbarModule, DxSelectBoxModule, DxRadioGroupModule, DxButtonGroupModule, DxDateBoxModule, DxListModule, DxValidatorModule, DxBoxModule, DxTextAreaModule, DxDataGridModule } from 'devextreme-angular';
import { TabsModule, ModalModule, PopoverModule } from 'ngx-bootstrap';
import { FileUploadModule as PrimeNgFileUploadModule } from 'primeng/primeng';
import { FilterLeaveApplicationComponent } from './leave-application/filter-leave-application/filter-leave-application.component';
import { CreateOrUpdateApplicationComponent } from './leave-application/create-or-update-application/create-or-update-application.component';
import { LeaveApplicationDetailsComponent } from './leave-application/leave-application-details/leave-application-details.component';
import { ReviewAndApprovalRegistrationComponent } from './leave-application/review-and-approval-registration/review-and-approval-registration.component';
import { ApplicationLogsComponent } from './leave-application/application-logs/application-logs.component';
import { ReportViewer2Component } from './report-viewer2/report-viewer2.component';
import { DxReportViewerModule } from 'devexpress-reporting-angular';
import { LeaveApplicationEditPopupComponent } from './leave-application/leave-application-edit-popup/leave-application-edit-popup.component';
import { ReportsComponent } from './reports/reports.component';
import { LeaveApplicationManagementComponent } from './leave-application-management/leave-application-management.component';
import { LeaveApplicationReasonComponent } from './leave-application-reason/leave-application-reason.component';
import { LeaveApplicationReasonEditPopupComponent } from './leave-application-reason/leave-application-reason-edit-popup/leave-application-reason-edit-popup.component';
import { LeaveApplicationConfigComponent } from './leave-application-config/leave-application-config.component';
import { LeaveApplicationConfigEditPopupComponent } from './leave-application-config/leave-application-config-edit-popup/leave-application-config-edit-popup.component';
import { NotifySignalrService } from '@app/shared/layout/notifications/notify-signalr.service';
import { FastApprovalLeaveComponent } from './leave-application/fast-approval-leave/fast-approval-leave.component';
import { LeaveApprovalAuthorizationComponent } from './leave-application/leave-approval-authorization/leave-approval-authorization.component';
import { CreateOrUpdateLeaveApprovalAuthorizationComponent } from './leave-application/leave-approval-authorization/create-or-update-authorization/create-or-update-authorization.component';
import { FileUploadModule } from '@node_modules/ng2-file-upload';

@NgModule({
  declarations: [ // Declare all child component
    LeaveApplicationComponent,
    LeaveApplicationTypeComponent,
    ApprovalRoleComponent,
    LeaveApplicationTypeEditPopupComponent,
    ApprovalRoleEditPopupComponent,
    FilterLeaveApplicationComponent,
    CreateOrUpdateApplicationComponent,
    LeaveApplicationDetailsComponent,
    ReviewAndApprovalRegistrationComponent,
    ApplicationLogsComponent,
    ReportViewer2Component,
    LeaveApplicationEditPopupComponent,
    ReportsComponent,
    LeaveApplicationManagementComponent,
    LeaveApplicationConfigComponent,
    LeaveApplicationConfigEditPopupComponent,
    LeaveApplicationReasonComponent,
    LeaveApplicationReasonEditPopupComponent,
    FastApprovalLeaveComponent, 
    LeaveApprovalAuthorizationComponent,
    CreateOrUpdateLeaveApprovalAuthorizationComponent,
  ],
  imports: [ // Import module want to use
    LeaveRegistrationRoutingModule,
    CommonModule,
    UtilsModule,
    AppCommonModule,
    FormsModule,
    ReactiveFormsModule,
    DevExtremeModule,
    DxTemplateModule,
    DxReportViewerModule,
    DxToolbarModule,
    DxSelectBoxModule,
    DxRadioGroupModule,
    DxButtonGroupModule,
    DxDateBoxModule,
    DxListModule,
    DxDataGridModule,
    TabsModule,
    ModalModule,
    PopoverModule,
    PrimeNgFileUploadModule,
    DxValidatorModule,
    DxBoxModule,
    FileUploadModule,
  ],
  providers: [ // Call service proxy API
    LeaveApplicationTypeServiceProxy,
    ApprovalRoleServiceProxy,
    LeaveApplicationServiceProxy,
    CommonServiceServiceProxy,
    LeaveApplicationLogServiceProxy,
    EmployeeInfoServiceProxy,
    EmployeeAnnualLeaveServiceProxy,
    BlockDepartmentServiceProxy,
    LeaveApplicationReasonServiceProxy,
    MobileTokenServiceProxy,
    LeaveApplicationConfigServiceProxy,
    NotifySignalrService,
    LeaveApprovalAuthorizationServiceProxy,
  ]
})
export class LeaveRegistrationModule { }
