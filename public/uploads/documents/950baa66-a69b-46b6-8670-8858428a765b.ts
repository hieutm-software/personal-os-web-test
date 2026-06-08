import { Component, Injector, OnInit, ViewChild, OnDestroy } from "@angular/core";
import { ActivatedRoute, ParamMap, Router, NavigationStart } from "@angular/router";
import { PreviewFileComponent } from "@app/shared/common/preview-file/preview-file.component";
import { appModuleAnimation } from "@shared/animations/routerTransition";
import { Location } from "@angular/common";
import { AppComponentBase } from "@shared/common/app-component-base";
import {
    CommonServiceServiceProxy,
    EmployeeAnnualLeaveDto,
    EmployeeAnnualLeaveServiceProxy,
    EmployeeInfoDto,
    EmployeeInfoServiceProxy,
    ERPComboboxItem,
    LeaveApplicationDto,
    LeaveApplicationLogDto,
    LeaveApplicationLogServiceProxy,
    LeaveApplicationReasonDto,
    LeaveApplicationReasonServiceProxy,
    LeaveApplicationServiceProxy,
    UploadFileDto,
} from "@shared/service-proxies/service-proxies";
import {
    LeaveApplicationButtonActionValue,
    LeaveApplicationHelper,
    LeaveApplicationStatusValue,
} from "@shared/helpers/LeaveApplicationHelper";
import ArrayStore from "devextreme/data/array_store";
import { AppConsts } from "@shared/AppConsts";
import { PermissionCheckerService } from "abp-ng2-module/dist/src/auth/permission-checker.service";
import { ReviewAndApprovalRegistrationComponent } from "../review-and-approval-registration/review-and-approval-registration.component";
import { isNil } from "lodash";
import { ApplicationLogsComponent } from "../application-logs/application-logs.component";
import CustomStore from "devextreme/data/custom_store";
import { EOffHelper } from "@shared/helpers/EOffHelper";
import { ReportViewer2Component } from "@app/leave-registration/report-viewer2/report-viewer2.component";
import moment from "moment";
import { DxDataGridComponent } from "devextreme-angular";
import { Subscription } from "rxjs";

@Component({
    selector: "leave-application-details",
    templateUrl: "./leave-application-details.component.html",
    styleUrls: ["./leave-application-details.component.css"],
    animations: [appModuleAnimation()],
})
export class LeaveApplicationDetailsComponent extends AppComponentBase implements OnInit, OnDestroy {
    @ViewChild(PreviewFileComponent, { static: true })
    previewFilePopup: PreviewFileComponent;
    @ViewChild(ReviewAndApprovalRegistrationComponent, { static: true })
    reviewAndApprovalPopup: ReviewAndApprovalRegistrationComponent;
    @ViewChild(ApplicationLogsComponent, { static: true })
    applicationLogTable: ApplicationLogsComponent;
    @ViewChild(ReportViewer2Component, { static: true })
    reportViewer: ReportViewer2Component;
    @ViewChild('dataGrid', { static: true }) dataGrid: DxDataGridComponent;

    dataStatuses: any;
    fileListDto: UploadFileDto[] = [];
    fileLists = "";

    leaveApplicationData: LeaveApplicationDto = new LeaveApplicationDto();
    employeeInfoData: EmployeeInfoDto = new EmployeeInfoDto();
    employeeAnnualLeaveData: EmployeeAnnualLeaveDto = new EmployeeAnnualLeaveDto();
    leaveAppLogs: LeaveApplicationLogDto[];
    leaveApplicationId: number;
    employeeName = "sampleData";
    dataApplicationType: any;
    dataDepartment: any;
    applicationTypeValue: any;
    numberOfDayOffValue: number;
    userId: number;
    popupActionisible = false;

    lstUsers: ERPComboboxItem[] = [];
    lstGroups: ERPComboboxItem[] = [];

    dataAuthorized: any;
    dataCensor: any;
    gridDataUsersSource: any;
    authorizedValue: number;
    censorValue: number;
    reasonEditVisible = false;
    titleName: string;
    statusBtn: number;

    txtUserGrpRelatedPeopleSelection = "";
    gridDataRelatedPeopleSource: any;
    gridBoxRelatedPeopleValue: number[] = [];
    gridDataRelatedPeopleGroupSource: any;
    gridBoxRelatedPeopleGroupValue: number[] = [];

    currentYear: number;
    lastYear: number;
    currentDate: Date;

    dataSource: any;
    filterText: '';
    dataApplicationReason: any;
    lstApplicationReason: LeaveApplicationReasonDto[] = [];
    IsReject: boolean;
    checkMaxStatus: boolean;
    checkUserApproval: boolean;
    IsMaxOrReject: boolean;


    private routerSubscription: Subscription;

    constructor(
        injector: Injector,
        private _leaveApplicationService: LeaveApplicationServiceProxy,
        private _commonService: CommonServiceServiceProxy,
        private _activatedRoute: ActivatedRoute,
        private _leaveApplicationLogService: LeaveApplicationLogServiceProxy,
        private _employeeInfoService: EmployeeInfoServiceProxy,
        private _employeeAnnualLeaveService: EmployeeAnnualLeaveServiceProxy,
        private _leaveApplicationReasonServiceProxy: LeaveApplicationReasonServiceProxy,
        private location: Location,
        private router: Router,
    ) {
        super(injector);
    }

    ngOnInit() {
        abp.event.trigger("urlChanged");
        this.currentYear = moment().year();
        this.lastYear = moment().year() - 1;
        this.userId = this.appSession.userId;

        this.dataStatuses = LeaveApplicationHelper.getAllLeaveApplicationStatusesList();

        this._commonService
            .getLookups("LeaveApplicationType", this.appSession.tenantId, undefined)
            .subscribe((result) => {
                this.dataApplicationType = new ArrayStore({
                    data: result,
                    key: "value",
                });
            });

        this._commonService
            .getLookups("Department", this.appSession.tenantId, undefined)
            .subscribe((result) => {
                this.dataDepartment = new ArrayStore({
                    data: result,
                    key: "value",
                });
            });

        this._activatedRoute.paramMap.subscribe((params: ParamMap) => {
            const newId = params.get('id');
            if (newId) {
                this.leaveApplicationId = parseInt(newId, 10);
                this.loadInfo(this.leaveApplicationId);
            }
        });

        if (this.leaveApplicationData.reasonEdit != null) {
            this.reasonEditVisible = true;
        }

        this.printClick = this.printClick.bind(this);

        this.routerSubscription = this.router.events.subscribe((event) => {
            if (event instanceof NavigationStart) {
                if (event.url !== '/app/leave-registration/leave-application/view-details') {
                    //this.restoreOriginalPermissions();
                }
            }
        });

        //window.addEventListener('beforeunload', this.restoreOriginalPermissions.bind(this));
    }

    ngOnDestroy() {
        this.routerSubscription.unsubscribe();
        // window.removeEventListener('beforeunload', this.restoreOriginalPermissions.bind(this));
        // this.restoreOriginalPermissions();
    }

    // restoreOriginalPermissions() {
    //     console.log('Restoring original permissions...');
    //     this._leaveApplicationService.restoreOriginalPermissions(this.userId);
    // }

    loadInfo(id: number) {
        if (id) {
            Promise.all([
                this._commonService
                    .getLookups("UsersFullName", this.appSession.tenantId, undefined)
                    .toPromise(),
                this._commonService
                    .getLookups("Groups", this.appSession.tenantId, undefined)
                    .toPromise(),
                this._leaveApplicationService.getDetailsById(id).toPromise(),
            ]).then((result) => {

                this._commonService
                .getLookups("StatusApproval", this.appSession.tenantId, result[2].typeApprovalId)
                .subscribe((result) => {
                    this.dataStatuses = new ArrayStore({
                        data: result,
                        key: "value",
                    });
                });

                this.lstUsers = result[0];
                this.lstGroups = result[1];
                this.leaveApplicationData = result[2];

                if (this.leaveApplicationData.status == -1){
                    this.IsReject = true;
                }
                if (this.leaveApplicationData.censorId == this.appSession.userId || this.leaveApplicationData.authorizedByUserId == this.appSession.userId){
                    this.checkUserApproval = true;
                }

                this._leaveApplicationService.getMaxStatus(result[2].typeApprovalId).subscribe(result => {
                    console.log(this.leaveApplicationData.status , "result[2].status ")
                    if (this.leaveApplicationData.status == result){
                        this.checkMaxStatus = true;
                    }
                    else{
                        if (this.leaveApplicationData.status != -1){
                            this.IsMaxOrReject = true;
                        }
                    }
                })


                

                if (this.leaveApplicationData.reasonEdit != null) {
                    this.reasonEditVisible = true;
                }

                this.dataAuthorized = this.lstUsers;
                this.dataCensor = this.lstUsers;
                this.gridDataRelatedPeopleSource = this.lstUsers;
                this.gridDataRelatedPeopleGroupSource = this.lstGroups;

                this.leaveAppLogs = this.leaveApplicationData.leaveAppLogs;

                this.leaveAppLogs.forEach(item => {
                    item.censorName = LeaveApplicationHelper.getLeaveApplicationStatusByValue(item.status);
                });

                this.applicationTypeValue = this.leaveApplicationData.applicationTypeId;

                this.gridBoxRelatedPeopleValue = EOffHelper.convertStringToList(
                    this.leaveApplicationData.relatedPeopleList
                );
                this.gridBoxRelatedPeopleGroupValue = EOffHelper.convertStringToList(
                    this.leaveApplicationData.relatedGroupList
                );

                if (!isNil(this.lstUsers) && this.lstUsers.length > 0) {
                    this.txtUserGrpRelatedPeopleSelection = EOffHelper.convertValuesToTexts(
                        this.gridBoxRelatedPeopleValue,
                        this.lstUsers
                    );
                }
                if (!isNil(this.lstGroups) && this.lstGroups.length > 0) {
                    this.txtUserGrpRelatedPeopleSelection += ", " + EOffHelper.convertValuesToTexts(
                        this.gridBoxRelatedPeopleGroupValue,
                        this.lstGroups
                    );
                }

                // Get EmployeeInfo
                this._employeeInfoService
                    .getBySubscriberEmail(this.leaveApplicationData.subcriberEmail)
                    .subscribe((result) => {
                        this.employeeInfoData = result;

                        // Get employeeAnnualLeave
                        this._employeeAnnualLeaveService
                            .getAnuualByEmployeeId(this.leaveApplicationData.subscriberId, this.employeeInfoData.employeeId)
                            .subscribe((result) => {
                                this.employeeAnnualLeaveData = result;
                                // if (moment().month() > 2) {
                                //     if (this.employeeAnnualLeaveData.daysUsed > this.employeeAnnualLeaveData.annualLeaveLastYear &&
                                //         this.employeeAnnualLeaveData.annualLeaveThisYearUsed == 0) {
                                //         this.employeeAnnualLeaveData.annualLeaveThisYearUsed = this.employeeAnnualLeaveData.daysUsed - this.employeeAnnualLeaveData.annualLeaveLastYear;
                                //     }
                                //     this.employeeAnnualLeaveData.daysLeft = this.employeeAnnualLeaveData.numberOfAnnualLeave - this.employeeAnnualLeaveData.annualLeaveThisYearUsed;

                                //     if (this.employeeAnnualLeaveData.daysLeft < 0) {
                                //         this.employeeAnnualLeaveData.daysLeft = 0;
                                //     }
                                // } else {
                                //     this.employeeAnnualLeaveData.daysLeft = this.employeeAnnualLeaveData.numberOfAnnualLeave + this.employeeAnnualLeaveData.annualLeaveLastYear - this.employeeAnnualLeaveData.daysUsed;
                                // }
                            });
                    });

                this._leaveApplicationReasonServiceProxy.getByLeaveTypeId(this.leaveApplicationData.applicationTypeId).subscribe((result) => {
                    this.lstApplicationReason = result;
                    this.dataApplicationReason = new ArrayStore({
                        data: this.lstApplicationReason,
                        key: 'id'
                    });
                });

                // this._leaveApplicationService.checkLeaveRequest(this.leaveApplicationData).subscribe((result) => {
                //     this.statusBtn = result.status;
                //     this.titleName = result.titleName;
                // });

                // if (this.userId !== this.leaveApplicationData.censorId) {
                //     if (result[2].status == 1) {
                //         this.titleName = "Người xem xét";
                //     } else if (result[2].status == 2) {
                //         this.titleName = "Người kiểm tra";
                //     } else if (result[2].status == 3) {
                //         this.titleName = "Người thông qua";
                //     } else if (result[2].status == 4) {
                //         this.titleName = "Người phê duyệt";
                //     } else if (result[2].status == 5) {
                //         this.titleName = "Người phê duyệt";
                //     } else if (result[2].status == 6) {
                //         this.titleName = "Người từ chối";
                //     }
                // }

                this._leaveApplicationService.checkLeaveRequestNew(this.leaveApplicationData).subscribe(result => {
                    this.titleName = result.titleName;
                })

            }).catch((error) => {
                console.log(error);
            });
        }
    }

    canDecline() {
        return (
            (this.leaveApplicationData.status != LeaveApplicationStatusValue.Approved) 
            &&
            this.leaveApplicationData.status != LeaveApplicationStatusValue.RevokedOrDeclined 
            &&
            (this.leaveApplicationData.censorId === this.appSession.userId
                ||
                this.leaveApplicationData.authorizedByUserId === this.appSession.userId)
        );
    }

    reviewClick() {
        this.showActionPopup(LeaveApplicationButtonActionValue.Review, true);
    }

    acceptClick(){
        const statusNew = this.leaveApplicationData.status + 1;
        this._leaveApplicationService.checkNextStep(this.leaveApplicationId).subscribe(result => {
            if (result == 0){
                this.showActionPopup(statusNew, false);
            }
            else{
                this.showActionPopup(statusNew, true);
            }
        })
    }

    reAcceptClick(){
        this._leaveApplicationService.getMaxStatus(this.leaveApplicationData.typeApprovalId).subscribe(result => {
                this.showActionPopup(result, false);
        })
    }

    examineClick() {
        this.showActionPopup(LeaveApplicationButtonActionValue.Examine, true);
    }

    passClick() {
        this.showActionPopup(LeaveApplicationButtonActionValue.Pass, true);
    }

    approveClick() {
        this.showActionPopup(LeaveApplicationButtonActionValue.Approve, false);
    }

    reApproveClick() {
        this.showActionPopup(LeaveApplicationButtonActionValue.ReApproved, false);
    }

    reDeclineClick() {
        this.showActionPopup(LeaveApplicationButtonActionValue.ReDeclined, false);
    }

    declineClick() {
        this.showActionPopup(-1, false);
    }

    printClick() {
        this.reportViewer.reportUrl = "rptLeaveApplication";
        const parameters = new Map<string, any>();
        parameters.set("LeaveApplicationId", this.leaveApplicationId);
        this.reportViewer.parameters = parameters;
        this.reportViewer.openReport();
    }

    showActionPopup(action: number, blVisible: boolean) {
        this.reviewAndApprovalPopup.leaveApplicationData = this.leaveApplicationData;
        this.reviewAndApprovalPopup.employeeAnnualLeaveData = this.employeeAnnualLeaveData;
        this.reviewAndApprovalPopup.leaveApplicationId = this.leaveApplicationId;
        this.reviewAndApprovalPopup.isDeclineOrRevoke = blVisible;
        this.reviewAndApprovalPopup.show(action, this.leaveApplicationData.typeApprovalId);
    }

    onActionCompleted(id) {
        this.popupActionisible = false;
        this.router.navigateByUrl("/app/leave-registration/leave-application");
    }

    onClickBack() {
        this.router.navigateByUrl("/app/leave-registration/leave-application");
    }
}
