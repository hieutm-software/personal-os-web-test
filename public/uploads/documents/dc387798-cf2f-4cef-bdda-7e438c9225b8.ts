import {
    Component,
    EventEmitter,
    Injector,
    Input,
    OnInit,
    Output,
    ViewChild,
} from "@angular/core";
import { Router } from "@angular/router";
import { ChatSignalrService } from "@app/shared/layout/chat/chat-signalr.service";
import { AppComponentBase } from "@shared/common/app-component-base";
import {
    LeaveApplicationButtonActionValue,
    LeaveApplicationHelper,
    LeaveApplicationStatusValue,
} from "@shared/helpers/LeaveApplicationHelper";
import {
    BlockDepartmentServiceProxy,
    CommonServiceServiceProxy,
    EmployeeAnnualLeaveDto,
    EmployeeAnnualLeaveServiceProxy,
    ERPComboboxItem,
    LeaveApplicationDto,
    LeaveApplicationLogDto,
    LeaveApplicationLogServiceProxy,
    LeaveApplicationServiceProxy,
    LeaveApplicationTypeDto,
    LeaveApplicationTypeServiceProxy,
    UpdateDocumentStatusDto,
    UpdateStatusLeaveApplicationDto,
} from "@shared/service-proxies/service-proxies";
import { DxFormComponent } from "devextreme-angular";
import CustomStore from "devextreme/data/custom_store";
import { isNil, result } from "lodash";
import moment from "moment";

@Component({
    selector: "app-review-and-approval-registration",
    templateUrl: "./review-and-approval-registration.component.html",
    styleUrls: ["./review-and-approval-registration.component.css"],
})
export class ReviewAndApprovalRegistrationComponent extends AppComponentBase {
    @Output() onActionCompleted = new EventEmitter<any>();
    @Input() leaveApplicationData: LeaveApplicationDto =
        new LeaveApplicationDto();
    @Input() employeeAnnualLeaveData: EmployeeAnnualLeaveDto =
        new EmployeeAnnualLeaveDto();
    @ViewChild("leaveApplicationForm", { static: true })
    leaveApplicationForm: DxFormComponent;

    updateLeaveApplicationStatusData: UpdateStatusLeaveApplicationDto =
        new UpdateStatusLeaveApplicationDto();
    leaveApplicationTypeData: LeaveApplicationTypeDto =
        new LeaveApplicationTypeDto();

    leaveApplicationTypeText: string;
    reasonContent: string = 'Đồng Ý';
    leaveApplicationId: number;
    popupVisible = false;
    actionButton: number;
    actionValue: number;

    lstCensor: ERPComboboxItem[] = [];
    dataCensor: any;
    censorValue: number;
    messageValidate: string;
    leaderOfBlockDepart: any;
    visibleWarning: boolean = false;

    isDeclineOrRevoke: boolean;
    textWarning = "";
    constructor(
        injector: Injector,
        private _leaveApplicationService: LeaveApplicationServiceProxy,
        private _commonService: CommonServiceServiceProxy,
        private _leaveApplicationLogService: LeaveApplicationLogServiceProxy,
        private _employeeAnnualLeaveService: EmployeeAnnualLeaveServiceProxy,
        private _leaveApplicationTypeService: LeaveApplicationTypeServiceProxy,
        private _blockDepartmentService: BlockDepartmentServiceProxy,
        private router: Router,
        private _NotifySignalrService: ChatSignalrService
    ) {
        super(injector);
        this.onValueChangedCensor = this.onValueChangedCensor.bind(this);
        this.onValueChangedReasonContent =
            this.onValueChangedReasonContent.bind(this);
    }

    ngOnInit() {
        
     }

    show(actionButton: number, typeApproval:number) {
        this.actionButton = actionButton;
        this.popupVisible = true;
        //this.isMatchActionButton();

        this._leaveApplicationService.checkDonNghiPhep(this.leaveApplicationId).subscribe(result => {
            this.textWarning = result.replace("\\n","<br>");
            if (result != ""){
                this.visibleWarning = true;
            }
            console.log(this.textWarning, "this.textWarning")
        })

        if (this.actionButton === -1) {
            this.reasonContent = "Không đồng ý"
        }
        if (this.actionButton !== -1) {
            this.reasonContent = "Đồng ý"
        }

        this._commonService.getApprovalPeopleNew(typeApproval, actionButton, this.leaveApplicationId).subscribe(result => {
            this.dataCensor = new CustomStore({
                loadMode: "raw",
                key: "value",
                load() {
                    return result;
                }
            })
        })

        // if (
        //     this.actionButton !== LeaveApplicationButtonActionValue.Approve &&
        //     this.actionButton !== LeaveApplicationButtonActionValue.Decline
        // ) {
        //     this._blockDepartmentService
        //         .getLeaderByDepartmentId(this.leaveApplicationData.departmentId)
        //         .subscribe((rs) => {
        //             this.leaderOfBlockDepart = parseInt(rs.manager);

        //             // Lọc người phê duyệt
        //             this._commonService
        //                 .getApprovalPeople(
        //                     this.appSession.tenantId,
        //                     this.leaveApplicationData.departmentId,
        //                     this.actionButton,
        //                     false
        //                 )
        //                 .subscribe((result) => {
        //                     this.lstCensor = result;
        //                     if (
        //                         (this.isGranted('Pages.LeaveRegistration.Approvel.PGD') && this.leaveApplicationData.status == 3)
        //                     ) {
        //                         const originalDataCencor = [...this.lstCensor];
        //                         const temData = originalDataCencor.filter(item => item.displayCode === '5');
        //                         this.dataCensor = new CustomStore({
        //                             loadMode: "raw",
        //                             key: "value",
        //                             load() {
        //                                 return temData;
        //                             },
        //                         });
        //                         this.censorValue = temData[0].value;
        //                     } else if (
        //                         (this.isGranted('Pages.LeaveRegistration.Approvel.LDPTCHC'))
        //                     ) {
        //                         if (this.leaveApplicationData.listRole.includes('PTGD')) {
        //                             const originalDataCencor = [...this.lstCensor];
        //                             const temData = originalDataCencor.filter(item => item.displayCode === '5');
        //                             this.dataCensor = new CustomStore({
        //                                 loadMode: "raw",
        //                                 key: "value",
        //                                 load() {
        //                                     return temData;
        //                                 },
        //                             });
        //                             this.censorValue = temData[0].value;
        //                         } else {
        //                             const originalDataCencor = [...this.lstCensor];
        //                             const temData = originalDataCencor.filter(item => item.displayCode !== '5' && item.value === this.leaderOfBlockDepart);
        //                             this.dataCensor = new CustomStore({
        //                                 loadMode: "raw",
        //                                 key: "value",
        //                                 load() {
        //                                     return temData;
        //                                 },
        //                             });
        //                             this.censorValue = temData[0].value;
        //                         }
        //                     } else if (
        //                         (this.isGranted('Pages.LeaveRegistration.Approvel.LDP'))
        //                     ) {
        //                         const originalDataCencor = [...this.lstCensor];
        //                         const temData = originalDataCencor.filter(item => item.displayCode === '3');
        //                         this.dataCensor = new CustomStore({
        //                             loadMode: "raw",
        //                             key: "value",
        //                             load() {
        //                                 return temData;
        //                             },
        //                         });
        //                         this.censorValue = temData[0].value;
        //                     } else {
        //                         this.dataCensor = new CustomStore({
        //                             loadMode: "raw",
        //                             key: "value",
        //                             load() {
        //                                 return result;
        //                             },
        //                         });
        //                         this.censorValue = result[0].value;
        //                     }



        //                 });
        //         });
        // };
    }


    // canRevoke() {
    //   return (this.leaveApplicationData.status === LeaveApplicationStatusValue.Registered);
    // }
    // canDecline() {
    //   return (this.leaveApplicationData.status != LeaveApplicationStatusValue.Approved && (this.isGranted('Pages.LeaveRegistration.LeaveApplication.Decline')));
    // }
    // canReview() {
    //   return (this.leaveApplicationData.status === LeaveApplicationStatusValue.Registered);
    // }
    // canExamine() {
    //   return (this.leaveApplicationData.status === LeaveApplicationStatusValue.Reviewed);
    // }
    // canPass() {
    //   return (this.leaveApplicationData.status === LeaveApplicationStatusValue.Examined);
    // }
    // canApprove() {
    //   return (this.leaveApplicationData.status === LeaveApplicationStatusValue.Passed);
    // }

    // Khai báo các buttons
    revokeButtonOptions = {
        icon: "undo",
        text: this.l("Revoke"),
        stylingMode: "contained",
        type: "default",
        onClick: this.doAction.bind(this),
    };
    declineEditButtonOptions = {
        icon: "clear",
        text: this.l("Decline"),
        stylingMode: "contained",
        type: "default",
        onClick: this.doAction.bind(this),
    };
    reviewButtonOptions = {
        icon: "check",
        text: this.l("Review"),
        stylingMode: "contained",
        type: "default",
        onClick: this.doAction.bind(this),
    };
    examineButtonOptions = {
        icon: "check",
        text: this.l("Examine"),
        stylingMode: "contained",
        type: "default",
        onClick: this.doAction.bind(this),
    };
    passButtonOptions = {
        icon: "check",
        text: this.l("Pass"),
        stylingMode: "contained",
        type: "default",
        onClick: this.doAction.bind(this),
    };
    approveButtonOptions = {
        icon: "check",
        text: this.l("Approve"),
        stylingMode: "success",
        type: "default",
        onClick: this.doAction.bind(this),
    };

    acceptButtonOptions = {
        icon: "check",
        text: this.l("Đồng ý"),
        stylingMode: "success",
        type: "default",
        onClick: this.doActionNew.bind(this),
    };

    cancelEditButtonOptions = {
        icon: "close",
        text: this.l("Cancel"),
        stylingMode: "outlined",
        type: "normal",
        onClick: this.cancelEditButtonClick.bind(this),
    };

    doAction(e) {
        this.saveActionChange();
    }
    doActionNew(e) {
        this.saveActionChangeNew();
    }

    saveActionChange(): void {
        if (this.isDeclineOrRevoke) {
            //Kiem tra neu khong phai la hanh dong thu hoi - tu choi - phe duyet thi se hien thi o chon nguoi phe duyet tiep theo
            const isValid = this.leaveApplicationForm.instance.validate().isValid;
            if (!isValid) {
                return;
            }
            this.updateLeaveApplicationStatusData.status = this.actionValue;
            this.updateLeaveApplicationStatusData.censorId = this.censorValue;
        } else {
            if (
                this.actionValue === LeaveApplicationButtonActionValue.Decline 
                ||
                this.actionValue === LeaveApplicationButtonActionValue.Revoke
            ) {
                this.updateLeaveApplicationStatusData.status = LeaveApplicationStatusValue.RevokedOrDeclined;
                this.updateLeaveApplicationStatusData.censorId = this.appSession.user.id;
            } else if (
                this.actionValue === LeaveApplicationButtonActionValue.Approve
            ) {
                this.updateLeaveApplicationStatusData.censorId = this.appSession.user.id;
                this.updateLeaveApplicationStatusData.status = this.actionValue;
            }
        }

        if (!isNil(this.reasonContent)) {
            if(this.leaveApplicationData.authorizedByUserId != null) {
                if(this.leaveApplicationData.authorizedByUserId == this.appSession.user.id) {
                    this.reasonContent = this.reasonContent + ' (Được ủy quyền phê duyệt bởi '+this.leaveApplicationData.censorName+')'
                }
            }
            this.updateLeaveApplicationStatusData.note = this.reasonContent;

        } else {
            this.updateLeaveApplicationStatusData.note =
                LeaveApplicationHelper.getLeaveApplicationStatusByValue(
                    this.actionValue
                );
        }

        this.updateLeaveApplicationStatusData.approverId = this.appSession.user.id;
        this.updateLeaveApplicationStatusData.approvedDate = moment();
        this.updateLeaveApplicationStatusData.id = this.leaveApplicationId;
        this.updateLeaveApplicationStatusData.subscriberId = this.leaveApplicationData.subscriberId;

        this._leaveApplicationTypeService
            .getById(this.leaveApplicationData.applicationTypeId)
            .subscribe((result) => {
                this.leaveApplicationTypeData = result;

                if (!isNil(this.actionValue)) {
                    this._leaveApplicationService
                        .updateLeaveApplicationStatus(
                            this.updateLeaveApplicationStatusData
                        )
                        .toPromise()
                        .then((rs) => {
                            const logs = new LeaveApplicationLogDto();
                            logs.leaveApplicationId = this.leaveApplicationId;
                            logs.approvedDate = moment();
                            logs.note = JSON.stringify(this.reasonContent);
                            logs.censorId = this.updateLeaveApplicationStatusData.censorId;
                            if (!isNil(this.reasonContent)) {
                                logs.note = JSON.stringify(this.reasonContent);
                            } else {
                                logs.note =
                                    LeaveApplicationHelper.getLeaveApplicationStatusByValue(
                                        this.actionValue
                                    );
                            }
                            if (
                                this.actionValue ===
                                LeaveApplicationButtonActionValue.Decline ||
                                this.actionValue ===
                                LeaveApplicationButtonActionValue.Revoke
                            ) {
                                logs.status =
                                    LeaveApplicationStatusValue.RevokedOrDeclined;
                                // Cập nhật lại số phép Sau khi từ chối hoặc thu hồi
                                this.leaveApplicationData.annualLeaveWhenCreate =
                                    this.employeeAnnualLeaveData.daysLeft;
                                this._leaveApplicationService
                                    .updateAnnual(this.leaveApplicationData)
                                    .toPromise()
                                    .then((response: any) => {
                                    });
                            } else {
                                logs.status = this.actionValue;
                            }

                            logs.approverId = this.appSession.user.id;
                            this._leaveApplicationLogService
                                .create(logs)
                                .toPromise()
                                .then((response: any) => {
                                });

                            //Update annual leave
                            // const annualLeave = this.employeeAnnualLeaveData;
                            // if (
                            //     this.actionValue ===
                            //     LeaveApplicationButtonActionValue.Approve &&
                            //     this.leaveApplicationTypeData.code
                            //         .trim()
                            //         .toUpperCase() === "P"
                            // ) {
                            //     // Cập nhật lại số phép Sau khi Phê duyệt
                            //     annualLeave.daysUsed +=
                            //         this.leaveApplicationData.numberOfDayOff;
                            //     // Tháng 4 - 12
                            //     if (moment().month() > 2) {
                            //         if (
                            //             this.leaveApplicationData.fromDate.month() < 3
                            //         ) {
                            //             annualLeave.daysLeft =
                            //                 annualLeave.numberOfAnnualLeave +
                            //                 annualLeave.annualLeaveLastYear -
                            //                 annualLeave.daysUsed;
                            //             if (
                            //                 annualLeave.daysUsed >
                            //                 annualLeave.annualLeaveLastYear &&
                            //                 annualLeave.annualLeaveThisYearUsed == 0
                            //             ) {
                            //                 annualLeave.annualLeaveThisYearUsed =
                            //                     annualLeave.daysUsed -
                            //                     annualLeave.annualLeaveLastYear;
                            //             } else {
                            //                 annualLeave.annualLeaveThisYearUsed = 0;
                            //             }
                            //         } else {
                            //             if (
                            //                 annualLeave.daysUsed >
                            //                 annualLeave.annualLeaveLastYear &&
                            //                 annualLeave.annualLeaveThisYearUsed == 0
                            //             ) {
                            //                 annualLeave.annualLeaveThisYearUsed =
                            //                     annualLeave.daysUsed -
                            //                     annualLeave.annualLeaveLastYear;
                            //                 annualLeave.daysLeft =
                            //                     annualLeave.numberOfAnnualLeave -
                            //                     annualLeave.annualLeaveThisYearUsed;
                            //             } else {
                            //                 annualLeave.annualLeaveThisYearUsed +=
                            //                     this.leaveApplicationData.numberOfDayOff;
                            //                 annualLeave.daysLeft =
                            //                     annualLeave.numberOfAnnualLeave -
                            //                     annualLeave.annualLeaveThisYearUsed;
                            //                 if (annualLeave.daysLeft < 0) {
                            //                     annualLeave.daysLeft = 0;
                            //                 }
                            //             }
                            //         }
                            //     } else {
                            //         // Tính toán số phép đăng ký vào Tháng 1 - 3
                            //         if (
                            //             // Nếu Ngày nghỉ là sau tháng 3
                            //             this.leaveApplicationData.fromDate.month() > 2
                            //         ) {
                            //             annualLeave.annualLeaveThisYearUsed +=
                            //                 this.leaveApplicationData.numberOfDayOff;
                            //         }

                            //         // Nếu số phếp đã dùng >= số phếp năm cũ và tháng tạo đơn <= tháng 3 thì có công thức:
                            //         // annualLeaveThisYearUsed = annualLeave.daysUsed - annualLeave.annualLeaveLastYear;
                            //         if (
                            //             this.leaveApplicationData.fromDate.month() <=
                            //             2 &&
                            //             annualLeave.daysUsed >=
                            //             annualLeave.annualLeaveLastYear
                            //         ) {
                            //             annualLeave.annualLeaveThisYearUsed =
                            //                 annualLeave.daysUsed -
                            //                 annualLeave.annualLeaveLastYear;
                            //         }
                            //         annualLeave.daysLeft =
                            //             annualLeave.numberOfAnnualLeave +
                            //             annualLeave.annualLeaveLastYear -
                            //             annualLeave.daysUsed;
                            //     }

                            //     this.leaveApplicationData.annualLeaveWhenCreate =
                            //         annualLeave.daysLeft;
                            //     this._employeeAnnualLeaveService
                            //         .update(annualLeave)
                            //         .toPromise()
                            //         .then((response: any) => {
                            //         });
                            //     // if (!isNil(this.actionValue)) {
                            //     //     if (
                            //     //         this.updateLeaveApplicationStatusData
                            //     //             .status ===
                            //     //         LeaveApplicationButtonActionValue.Approve
                            //     //     ) {
                            //     //         console.log(this.leaveApplicationData);

                            //     this._leaveApplicationService
                            //         .updateAnnual(this.leaveApplicationData)
                            //         .toPromise()
                            //         .then((response: any) => {
                            //         });
                            //     //     }
                            //     // }
                            // }

                            // if (
                            //     this.actionValue ===
                            //     LeaveApplicationButtonActionValue.Revoke
                            // ) {
                            //     // annualLeave.daysUsed += this.leaveApplicationData.numberOfDayOff;
                            //     // annualLeave.daysLeft = (annualLeave.numberOfAnnualLeave + annualLeave.annualLeaveLastYear) - annualLeave.daysUsed;
                            //     console.log("Do nothing this time");
                            // }

                            this.onActionCompleted.emit(
                                this.updateLeaveApplicationStatusData.id
                            );
                            this.onActionCompleted.emit(
                                this.leaveApplicationData.annualLeaveWhenCreate
                            );
                            // this._NotifySignalrService.sendNotify(rs, (() => {}));
                            this.notify.success(this.l("Thành Công"));
                            this.router.navigateByUrl(
                                "/app/leave-registration/leave-application"
                            );
                            
                            this.popupVisible = false;
                        })
                        .catch((error) => {
                            // this.notify.error(error);
                            this.popupVisible = false;
                        });
                } else {
                    this.notify.warn("Kiểm tra thông tin trạng thái cập nhật của đơn");
                    this.popupVisible = false;
                }
            });


    }


    saveActionChangeNew(): void {
        // console.log(this.actionButton, "this.actionButton");
        // console.log(this.isDeclineOrRevoke, "isDeclineOrRevoke");
        // if (this.isDeclineOrRevoke) {
        //     //Kiem tra neu khong phai la hanh dong thu hoi - tu choi - phe duyet thi se hien thi o chon nguoi phe duyet tiep theo
        //     var isValid = this.leaveApplicationForm.instance.validate().isValid;
        //     if (!isValid) {
        //         return;
        //     }
        //     this.updateLeaveApplicationStatusData.status = this.actionButton;
        //     this.updateLeaveApplicationStatusData.censorId = this.censorValue;
        // } else {
        //     if (
        //         this.actionValue === LeaveApplicationButtonActionValue.Decline 
        //         ||
        //         this.actionValue === LeaveApplicationButtonActionValue.Revoke
        //     ) {
        //         this.updateLeaveApplicationStatusData.status = LeaveApplicationStatusValue.RevokedOrDeclined;
        //         this.updateLeaveApplicationStatusData.censorId = this.appSession.user.id;
        //     } else if (
        //         this.actionValue === LeaveApplicationButtonActionValue.Approve
        //     ) {
        //         this.updateLeaveApplicationStatusData.censorId = this.appSession.user.id;
        //         this.updateLeaveApplicationStatusData.status = this.actionValue;
        //     }
        // }

        // var isValid = this.leaveApplicationForm.instance.validate().isValid;
        // if (!isValid) {
        //     return;
        // }

        this.updateLeaveApplicationStatusData.status = this.actionButton;
        if (this.isDeclineOrRevoke){
            this.updateLeaveApplicationStatusData.censorId = this.censorValue;
        }
        else{
            this.updateLeaveApplicationStatusData.censorId = this.appSession.user.id;
        }

        if (!isNil(this.reasonContent)) {
            if(this.leaveApplicationData.authorizedByUserId != null) {
                if(this.leaveApplicationData.authorizedByUserId == this.appSession.user.id) {
                    this.reasonContent = this.reasonContent + ' (Được ủy quyền phê duyệt bởi '+this.leaveApplicationData.censorName+')'
                }
            }
            this.updateLeaveApplicationStatusData.note = this.reasonContent;

        } else {
            this.updateLeaveApplicationStatusData.note =
                LeaveApplicationHelper.getLeaveApplicationStatusByValue(
                    this.actionValue
                );
        }

        this.updateLeaveApplicationStatusData.approverId = this.appSession.user.id;
        this.updateLeaveApplicationStatusData.approvedDate = moment();
        this.updateLeaveApplicationStatusData.id = this.leaveApplicationId;
        this.updateLeaveApplicationStatusData.subscriberId = this.leaveApplicationData.subscriberId;

        this._leaveApplicationTypeService
            .getById(this.leaveApplicationData.applicationTypeId)
            .subscribe((result) => {
                this.leaveApplicationTypeData = result;
                if (!isNil(this.actionButton)) {
                    this._leaveApplicationService
                        .updateLeaveApplicationStatusNew(
                            this.updateLeaveApplicationStatusData
                        )
                        .toPromise()
                        .then((rs) => {
                            const logs = new LeaveApplicationLogDto();
                            logs.leaveApplicationId = this.leaveApplicationId;
                            logs.approvedDate = moment();
                            logs.note = JSON.stringify(this.reasonContent);
                            logs.censorId = this.updateLeaveApplicationStatusData.censorId;
                            if (!isNil(this.reasonContent)) {
                                logs.note = JSON.stringify(this.reasonContent);
                            } else {
                                logs.note =
                                    LeaveApplicationHelper.getLeaveApplicationStatusByValue(
                                        this.actionValue
                                    );
                            }

                            this._leaveApplicationService.getMaxStatus(this.leaveApplicationData.typeApprovalId).subscribe(result => {

                                if (this.actionButton == -1 || this.actionButton == result) {
                                    logs.status = this.actionButton;
                                    if (this.actionButton == -1){
                                        // Cập nhật lại số phép Sau khi từ chối hoặc thu hồi
                                        this.leaveApplicationData.annualLeaveWhenCreate =
                                        this.employeeAnnualLeaveData.daysLeft;
                                        this._leaveApplicationService
                                            .updateAnnual(this.leaveApplicationData)
                                            .toPromise()
                                            .then((response: any) => {
                                            });
                                    }
                                    
                                } else {
                                    logs.status = this.leaveApplicationData.status;
                                }

                                logs.approverId = this.appSession.user.id;
                                this._leaveApplicationLogService
                                    .create(logs)
                                    .toPromise()
                                    .then((response: any) => {
                                    });

                                this.onActionCompleted.emit(
                                    this.updateLeaveApplicationStatusData.id
                                );
                                this.onActionCompleted.emit(
                                    this.leaveApplicationData.annualLeaveWhenCreate
                                );
                                // this._NotifySignalrService.sendNotify(rs, (() => {}));
                                this.notify.success(this.l("Thành Công"));
                                this.router.navigateByUrl(
                                    "/app/leave-registration/leave-application"
                                );
                                
                                this.popupVisible = false;
                            })

                            

                            

                            //Update annual leave
                            // const annualLeave = this.employeeAnnualLeaveData;
                            // if (
                            //     this.actionValue ===
                            //     LeaveApplicationButtonActionValue.Approve &&
                            //     this.leaveApplicationTypeData.code
                            //         .trim()
                            //         .toUpperCase() === "P"
                            // ) {
                            //     // Cập nhật lại số phép Sau khi Phê duyệt
                            //     annualLeave.daysUsed +=
                            //         this.leaveApplicationData.numberOfDayOff;
                            //     // Tháng 4 - 12
                            //     if (moment().month() > 2) {
                            //         if (
                            //             this.leaveApplicationData.fromDate.month() < 3
                            //         ) {
                            //             annualLeave.daysLeft =
                            //                 annualLeave.numberOfAnnualLeave +
                            //                 annualLeave.annualLeaveLastYear -
                            //                 annualLeave.daysUsed;
                            //             if (
                            //                 annualLeave.daysUsed >
                            //                 annualLeave.annualLeaveLastYear &&
                            //                 annualLeave.annualLeaveThisYearUsed == 0
                            //             ) {
                            //                 annualLeave.annualLeaveThisYearUsed =
                            //                     annualLeave.daysUsed -
                            //                     annualLeave.annualLeaveLastYear;
                            //             } else {
                            //                 annualLeave.annualLeaveThisYearUsed = 0;
                            //             }
                            //         } else {
                            //             if (
                            //                 annualLeave.daysUsed >
                            //                 annualLeave.annualLeaveLastYear &&
                            //                 annualLeave.annualLeaveThisYearUsed == 0
                            //             ) {
                            //                 annualLeave.annualLeaveThisYearUsed =
                            //                     annualLeave.daysUsed -
                            //                     annualLeave.annualLeaveLastYear;
                            //                 annualLeave.daysLeft =
                            //                     annualLeave.numberOfAnnualLeave -
                            //                     annualLeave.annualLeaveThisYearUsed;
                            //             } else {
                            //                 annualLeave.annualLeaveThisYearUsed +=
                            //                     this.leaveApplicationData.numberOfDayOff;
                            //                 annualLeave.daysLeft =
                            //                     annualLeave.numberOfAnnualLeave -
                            //                     annualLeave.annualLeaveThisYearUsed;
                            //                 if (annualLeave.daysLeft < 0) {
                            //                     annualLeave.daysLeft = 0;
                            //                 }
                            //             }
                            //         }
                            //     } else {
                            //         // Tính toán số phép đăng ký vào Tháng 1 - 3
                            //         if (
                            //             // Nếu Ngày nghỉ là sau tháng 3
                            //             this.leaveApplicationData.fromDate.month() > 2
                            //         ) {
                            //             annualLeave.annualLeaveThisYearUsed +=
                            //                 this.leaveApplicationData.numberOfDayOff;
                            //         }

                            //         // Nếu số phếp đã dùng >= số phếp năm cũ và tháng tạo đơn <= tháng 3 thì có công thức:
                            //         // annualLeaveThisYearUsed = annualLeave.daysUsed - annualLeave.annualLeaveLastYear;
                            //         if (
                            //             this.leaveApplicationData.fromDate.month() <=
                            //             2 &&
                            //             annualLeave.daysUsed >=
                            //             annualLeave.annualLeaveLastYear
                            //         ) {
                            //             annualLeave.annualLeaveThisYearUsed =
                            //                 annualLeave.daysUsed -
                            //                 annualLeave.annualLeaveLastYear;
                            //         }
                            //         annualLeave.daysLeft =
                            //             annualLeave.numberOfAnnualLeave +
                            //             annualLeave.annualLeaveLastYear -
                            //             annualLeave.daysUsed;
                            //     }

                            //     this.leaveApplicationData.annualLeaveWhenCreate =
                            //         annualLeave.daysLeft;
                            //     this._employeeAnnualLeaveService
                            //         .update(annualLeave)
                            //         .toPromise()
                            //         .then((response: any) => {
                            //         });
                            //     // if (!isNil(this.actionValue)) {
                            //     //     if (
                            //     //         this.updateLeaveApplicationStatusData
                            //     //             .status ===
                            //     //         LeaveApplicationButtonActionValue.Approve
                            //     //     ) {
                            //     //         console.log(this.leaveApplicationData);

                            //     this._leaveApplicationService
                            //         .updateAnnual(this.leaveApplicationData)
                            //         .toPromise()
                            //         .then((response: any) => {
                            //         });
                            //     //     }
                            //     // }
                            // }

                            // if (
                            //     this.actionValue ===
                            //     LeaveApplicationButtonActionValue.Revoke
                            // ) {
                            //     // annualLeave.daysUsed += this.leaveApplicationData.numberOfDayOff;
                            //     // annualLeave.daysLeft = (annualLeave.numberOfAnnualLeave + annualLeave.annualLeaveLastYear) - annualLeave.daysUsed;
                            //     console.log("Do nothing this time");
                            // }
                        })
                        .catch((error) => {
                            // this.notify.error(error);
                            this.popupVisible = false;
                        });
                } else {
                    this.notify.warn("Kiểm tra thông tin trạng thái cập nhật của đơn");
                    this.popupVisible = false;
                }
            });


    }

    // isMatchActionButton() {
    //     switch (this.actionButton) {
    //         case LeaveApplicationButtonActionValue.Review:
    //             this.actionValue = LeaveApplicationButtonActionValue.Review;
    //             break;
    //         case LeaveApplicationButtonActionValue.Examine:
    //             this.actionValue = LeaveApplicationButtonActionValue.Examine;
    //             break;
    //         case LeaveApplicationButtonActionValue.Pass:
    //             this.actionValue = LeaveApplicationButtonActionValue.Pass;
    //             break;
    //         case LeaveApplicationButtonActionValue.Approve: {
    //             this.actionValue = LeaveApplicationButtonActionValue.Approve;
    //             this.isDeclineOrRevoke = true;
    //             break;
    //         }
    //         case LeaveApplicationButtonActionValue.Revoke: {
    //             this.actionValue = LeaveApplicationButtonActionValue.Revoke;
    //             this.isDeclineOrRevoke = true;
    //             break;
    //         }
    //         case LeaveApplicationButtonActionValue.Decline: {
    //             this.actionValue = LeaveApplicationButtonActionValue.Decline;
    //             this.isDeclineOrRevoke = true;
    //             break;
    //         }
    //     }
    //     return this.actionValue;
    // }
    onValueChangedCensor(e) {
        this.censorValue = e.value;
    }
    onValueChangedReasonContent(e) {
        this.reasonContent = e.value;
    }
    cancelEditButtonClick(e) {
        this.updateLeaveApplicationStatusData.note = "";
        this.popupVisible = false;
    }
}
