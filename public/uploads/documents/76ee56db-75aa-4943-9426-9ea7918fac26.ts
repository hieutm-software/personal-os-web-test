import { NgModule } from '@angular/core';
import { Routes, RouterModule, Router, NavigationEnd } from '@angular/router';
import { ApprovalRoleComponent } from './approval-role/approval-role.component';
import { CreateOrUpdateApplicationComponent } from './leave-application/create-or-update-application/create-or-update-application.component';
import { LeaveApplicationDetailsComponent } from './leave-application/leave-application-details/leave-application-details.component';
import { LeaveApplicationComponent } from './leave-application/leave-application.component';
import { ReportsComponent } from './reports/reports.component';
import { LeaveApplicationManagementComponent } from './leave-application-management/leave-application-management.component';
import { ApplicationLogsComponent } from './leave-application/application-logs/application-logs.component';
import { LeaveApplicationTypeComponent } from './leave-application-type/leave-application-type.component';
import { LeaveApplicationReasonComponent } from './leave-application-reason/leave-application-reason.component';
import { LeaveApplicationConfigComponent } from './leave-application-config/leave-application-config.component';
import { FastApprovalLeaveComponent } from './leave-application/fast-approval-leave/fast-approval-leave.component';
import { LeaveApprovalAuthorizationComponent } from './leave-application/leave-approval-authorization/leave-approval-authorization.component';
import { CreateOrUpdateLeaveApprovalAuthorizationComponent } from './leave-application/leave-approval-authorization/create-or-update-authorization/create-or-update-authorization.component';


@NgModule({
  imports: [
    RouterModule.forChild([
      {
        path: '',
        children: [
          { path: 'leave-application/edit/:id', component: CreateOrUpdateApplicationComponent},
          { path: 'leave-application/view-details/:id', component: LeaveApplicationDetailsComponent},
          { path: 'leave-application', component: LeaveApplicationComponent},
          { path: 'leave-log', component: ApplicationLogsComponent},
          { path: 'leave-application/create', component: CreateOrUpdateApplicationComponent},
          { path: 'leave-application/fast-approval', component: FastApprovalLeaveComponent},
          { path: 'leave-application-type', component: LeaveApplicationTypeComponent},
          { path: 'leave-approval-authorization', component: LeaveApprovalAuthorizationComponent},
          // { path: 'leave-approval-authorization/create', component: CreateOrUpdateLeaveApprovalAuthorizationComponent},
          // { path: 'leave-approval-authorization/view-details/:id', component: CreateOrUpdateLeaveApprovalAuthorizationComponent},
          { path: 'approval-role', component: ApprovalRoleComponent, data: { permission: 'Pages.LeaveRegistration.ApprovalRole' } },
          { path: 'leave-application-management', component: LeaveApplicationManagementComponent, data: { permission: 'Pages.LeaveRegistration.Management' } },
          { path: 'reports', component: ReportsComponent, data: { permission: 'Pages.Report' } },
          { path: 'leave-application-reason', component: LeaveApplicationReasonComponent, data: { permission: 'Pages.LeaveRegistration.LeaveApplicationReason' } },
          { path: 'leave-application-config', component: LeaveApplicationConfigComponent, data: { permission: 'Pages.LeaveRegistration.LeaveApplicationConfig' } },
        ]
      }
    ])
  ],
  exports: [RouterModule]
})

export class LeaveRegistrationRoutingModule {
  constructor(
    private router: Router
  ) {
    router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        window.scroll(0, 0);
      }
    });
  }
}
