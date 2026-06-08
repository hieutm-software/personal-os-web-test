import {
    Component,
    EventEmitter,
    HostListener,
    Injector,
    OnInit,
    Output,
    ViewChild,
} from "@angular/core";
import { Router } from "@angular/router";
import { appModuleAnimation } from "@shared/animations/routerTransition";
import { AppComponentBase } from "@shared/common/app-component-base";
import {
    LeaveApplicationHelper,
    LeaveApplicationStatusLabel,
    LeaveApplicationStatusValue,
} from "@shared/helpers/LeaveApplicationHelper";
import {
    EmployeeAnnualLeaveDto,
    EmployeeAnnualLeaveServiceProxy,
    EmployeeInfoDto,
    EmployeeInfoServiceProxy,
    LeaveApplicationDto,
    LeaveApplicationLogDto,
    LeaveApplicationLogServiceProxy,
    LeaveApplicationServiceProxy,
    LeaveApplicationTypeDto,
    LeaveApplicationTypeServiceProxy,
    LeaveFastApprovelDto,
    UpdateStatusLeaveApplicationDto,
} from "@shared/service-proxies/service-proxies";
import { DxDataGridComponent, DxFormComponent } from "devextreme-angular";
import CustomStore from "devextreme/data/custom_store";
import { isNil } from "lodash";
import * as moment from "moment";
import { LazyLoadEvent } from "primeng/api";
import swal from "sweetalert2/src/sweetalert2.js";
import { Paginator } from "primeng/primeng";
import notify from "devextreme/ui/notify";
import { NotifySignalrService } from "@app/shared/layout/notifications/notify-signalr.service";
import { FilterCriteria, FilterLeaveApplicationComponent } from "../filter-leave-application/filter-leave-application.component";
import themes from "@node_modules/devextreme/ui/themes";

@Component({
    selector: "fast-approval-leave",
    templateUrl: "./fast-approval-leave.component.html",
    styleUrls: ["./fast-approval-leave.component.css"],
    animations: [appModuleAnimation()],
})
export class FastApprovalLeaveComponent extends AppComponentBase {
    @ViewChild("dataGrid", { static: true }) dataGrid: DxDataGridComponent;
    @ViewChild("formFilter", { static: true }) formFilter: DxFormComponent;
    @ViewChild("filterBox", { static: false })
    filterBox: FilterLeaveApplicationComponent; // div Filter
    @ViewChild("paginator", { static: true }) paginator: Paginator;

    @Output() onEditUnitsCompleted = new EventEmitter<any>();
    viewDetailPopupVisible = false;

    filterText = "";
    dataSource: any;
    readOnly = false;
    ReasonDelete = "";

    approvedDateValue: any;
    lstStatuses: any[];
    lstDate: any[];
    maxDate: any;
    selectedStatus: number;
    // advancedFiltersAreShown: boolean;
    filters: FilterCriteria;
    // leaveAppId: number;
    loadingVisible = false;

    leaveApplicationData: LeaveApplicationDto = new LeaveApplicationDto();
    employeeAnnualLeaveData: EmployeeAnnualLeaveDto =
        new EmployeeAnnualLeaveDto();
    leaveApplicationTypeData: LeaveApplicationTypeDto =
        new LeaveApplicationTypeDto();
    employeeInfoData: EmployeeInfoDto = new EmployeeInfoDto();
    screenHeight: any;
    currentYear: number;
    lastYear: number;

    allMode: string;
    checkBoxesMode: string;
    selectedItemKeys: any[] = [];
    selectHasData: boolean = true;
    leaveData: LeaveFastApprovelDto[] = [];
    arrCopyLeave: any[] = [];
    updateLeaveApplicationStatusData: UpdateStatusLeaveApplicationDto = new UpdateStatusLeaveApplicationDto();

    mapStatusPermission: Map<string, number> = new Map([
        [
            "Pages.LeaveRegistration.LeaveApplication.Status.Registered",
            LeaveApplicationStatusValue.Registered,
        ],
        [
            "Pages.LeaveRegistration.LeaveApplication.Status.Reviewed",
            LeaveApplicationStatusValue.Reviewed,
        ],
        [
            "Pages.LeaveRegistration.LeaveApplication.Status.Examined",
            LeaveApplicationStatusValue.Examined,
        ],
        [
            "Pages.LeaveRegistration.LeaveApplication.Status.Passed",
            LeaveApplicationStatusValue.Passed,
        ],
        [
            "Pages.LeaveRegistration.LeaveApplication.Status.Approved",
            LeaveApplicationStatusValue.Approved,
        ],
        [
            "Pages.LeaveRegistration.LeaveApplication.Status.Revoked",
            LeaveApplicationStatusValue.RevokedOrDeclined,
        ],
        [
            "Pages.LeaveRegistration.LeaveApplication.Status.Declined",
            LeaveApplicationStatusValue.RevokedOrDeclined,
        ],
    ]);
    allStatus: any[] = [
        {
            value: LeaveApplicationStatusValue.All,
            text: LeaveApplicationStatusLabel.All,
            type: "default",
        },
        {
            value: LeaveApplicationStatusValue.Registered,
            text: LeaveApplicationStatusLabel.Registered,
            type: "default",
        },
        {
            value: LeaveApplicationStatusValue.Reviewed,
            text: LeaveApplicationStatusLabel.Reviewed,
            type: "default",
        },
        {
            value: LeaveApplicationStatusValue.Examined,
            text: LeaveApplicationStatusLabel.Examined,
            type: "default",
        },
        {
            value: LeaveApplicationStatusValue.Passed,
            text: LeaveApplicationStatusLabel.Passed,
            type: "default",
        },
        {
            value: LeaveApplicationStatusValue.Approved,
            text: LeaveApplicationStatusLabel.Approved,
            type: "default",
        },
        {
            value: LeaveApplicationStatusValue.RevokedOrDeclined,
            text: LeaveApplicationStatusLabel.RevokedOrDeclined,
            type: "default",
        },
    ];

    constructor(
        injector: Injector,
        private router: Router,
        private _leaveApplicationService: LeaveApplicationServiceProxy,
        private _employeeAnnualLeaveService: EmployeeAnnualLeaveServiceProxy,
        private _leaveApplicationTypeService: LeaveApplicationTypeServiceProxy,
        private _employeeInfoService: EmployeeInfoServiceProxy,
        private _leaveApplicationLogService: LeaveApplicationLogServiceProxy,
        private _NotifySignalrService: NotifySignalrService
    ) {
        super(injector);
        this.screenHeight = window.innerHeight;
    }

    @HostListener("window:resize", ["$event"])
    onResize(event) {
        this.screenHeight = window.innerHeight;
    }

    ngOnInit() {
        abp.event.trigger("urlChanged");

        this.currentYear = moment().year();
        this.lastYear = moment().year() - 1;
        this.selectedStatus = LeaveApplicationStatusValue.All;
        this.filters = {
            leaveApplicationTypeId: null,
            departmenId: null,
            userId: null,
            status: "",
            fromDate: null,
            toDate: null,
        };
        const lsSelectedStatus = [];
        this.mapStatusPermission.forEach((v, k) => {
            if (this.isGranted(k)) {
                lsSelectedStatus.push(v);
            }
        });

        this.lstStatuses = [
            {
                value: LeaveApplicationStatusValue.All,
                text: LeaveApplicationStatusLabel.All,
                type: "default",
            },
        ];
        this.allStatus.forEach((item) => {
            if (lsSelectedStatus.indexOf(item.value) > -1) {
                this.lstStatuses.push(item);
            }
        });
        this.allMode = 'allPages';
        this.checkBoxesMode = themes.current().startsWith('material') ? 'always' : 'onClick';

        this.canEdit(this.appSession.userId);
        this.initFormData();
        this.getAll();

        this.allowDeleting = this.allowDeleting.bind(this);
        this.allowUpdating = this.allowUpdating.bind(this);
        this.onFilterButtonClick = this.onFilterButtonClick.bind(this);
        this.onClearButtonClick = this.onClearButtonClick.bind(this);
    }
    initFormData() {
        // Get EmployeeInfo
        this._employeeInfoService
            .getBySubscriberEmail(this.appSession.user.emailAddress)
            .subscribe((result) => {
                this.employeeInfoData = result;
                // Get employeeAnnualLeave
                this._employeeAnnualLeaveService
                    .getAnuualByEmployeeId(this.appSession.user.id, this.employeeInfoData.employeeId)
                    .subscribe((result) => {
                        this.employeeAnnualLeaveData = result;
                        if (moment().month() > 2) {
                            if (
                                this.employeeAnnualLeaveData.daysUsed >
                                this.employeeAnnualLeaveData
                                    .annualLeaveLastYear &&
                                this.employeeAnnualLeaveData
                                    .annualLeaveThisYearUsed == 0
                            ) {
                                this.employeeAnnualLeaveData.annualLeaveThisYearUsed =
                                    this.employeeAnnualLeaveData.daysUsed -
                                    this.employeeAnnualLeaveData
                                        .annualLeaveLastYear;
                            }
                            this.employeeAnnualLeaveData.daysLeft =
                                this.employeeAnnualLeaveData
                                    .numberOfAnnualLeave -
                                this.employeeAnnualLeaveData
                                    .annualLeaveThisYearUsed;

                            if (this.employeeAnnualLeaveData.daysLeft < 0) {
                                this.employeeAnnualLeaveData.daysLeft = 0;
                            }
                        } else {
                            this.employeeAnnualLeaveData.daysLeft =
                                this.employeeAnnualLeaveData
                                    .numberOfAnnualLeave +
                                this.employeeAnnualLeaveData
                                    .annualLeaveLastYear -
                                this.employeeAnnualLeaveData.daysUsed;
                        }
                    });
            });


    }

    // NOTE
    allowDeleting(e) {
        return (
            (this.isGranted("Pages.LeaveRegistration.LeaveApplication.Delete")
                && !this.isNotRevokeDeclineOrApprove(e.row.data.status)
                && this.appSession.user.id === e.row.data.subscriberId)
            || (this.isGranted("Pages.LeaveRegistration.LeaveApplication.Delete")
                && e.row.data.approvedDate >= this.approvedDateValue
                && e.row.data.status === LeaveApplicationStatusLabel.Approved)
            && moment().isSameOrBefore(e.row.data.fromDate, 'day')
            || this.isGranted("Pages.LeaveRegistration.LeaveApplication.Owner")
        );
    }

    canEdit(e) {
        return this._leaveApplicationService
            .checkCanEdit(this.appSession.userId)
            .toPromise()
            .then((response: any) => {


                return (this.approvedDateValue = response.approvedDate);
            })
            .catch((error) => {

            });
    }

    allowUpdating(e) {
        return (
            (this.isGranted("Pages.LeaveRegistration.LeaveApplication.EditAfterPassed")
                && !this.isNotRevokeDeclineOrApprove(e.row.data.status)
                && this.appSession.user.id === e.row.data.subscriberId)
            || (this.isGranted("Pages.LeaveRegistration.LeaveApplication.EditAfterPassed")
                && e.row.data.approvedDate >= this.approvedDateValue
                && e.row.data.status === LeaveApplicationStatusLabel.Approved
                && moment().isSameOrBefore(e.row.data.fromDate, "day")
            )
            || this.isGranted("Pages.LeaveRegistration.LeaveApplication.Owner")
        );
    }
    isNotHalfDayOff(e) {
        return !e.row.data.isHalfDayLeave;
    }
    onFilterButtonClick(e) {
        this.getAll();
    }

    onClearButtonClick(e) {
        this.formFilter.instance.resetValues();
    }

    onToolbarPreparing(e) {
        e.toolbarOptions.items.unshift({
            location: "before",
            widget: "dxButtonGroup",
            options: {
                width: 500,
                items: this.lstStatuses,
                stylingMode: "contained",
                keyExpr: "value",
                selectedItemKeys: this.selectedStatus,
                onItemClick: this.onStatusFilterChange.bind(this),
            },
        });
    }
    onCellPrepared(e) {

        if (e.rowType === "header" && e.column.caption == "Thao tác") {
            // e.cellElement.style.textAlign = 'right';
            e.cellElement.style.color = "#959595";
        }
        // if (e.rowType === "data") {
        //     if (
        //         e.data.censorId === this.appSession.userId &&
        //         e.data.subscriberId !== this.appSession.userId &&
        //         e.data.status !== LeaveApplicationStatusLabel.Approved &&
        //         e.data.status !== LeaveApplicationStatusLabel.RevokedOrDeclined
        //     ) {
        //         e.cellElement.style.backgroundColor = "rgb(92 149 197)";
        //     }
        // }
    }
    getAll() {
        const self = this;
        self.dataSource = {};
        self.dataSource.store = new CustomStore({
            key: "id",
            load(loadOptions: any) {
                const maxResultCount = loadOptions.take;
                const skipCount = loadOptions.skip || 0;
                const sorting = "STT desc, creationTime desc"; //creationTime desc

                // if (self.advancedFiltersAreShown) {
                //   self.filterText = '';
                // }
                let STT = 0;

                return self._leaveApplicationService
                    .getLeaveFastApproved(
                        self.filterText,
                        self.filters.leaveApplicationTypeId,
                        self.filters.departmenId,
                        self.selectedStatus,
                        self.filters.userId,
                        !isNil(self.filters.fromDate)
                            ? moment(self.filters.fromDate)
                            : undefined,

                        !isNil(self.filters.toDate)
                            ? moment(self.filters.toDate)
                            : undefined,
                            false,
                        sorting,
                        maxResultCount,
                        skipCount
                    )
                    .toPromise()
                    .then((response: any) => {
                        response.items.forEach((item) => {
                            ++STT;
                            item.status =
                                LeaveApplicationHelper.getLeaveApplicationStatusByValue(
                                    item.status
                                );
                            item.stt = STT;

                            // if ((item.status !== LeaveApplicationStatusValue.Approved && item.status !== LeaveApplicationStatusValue.RevokedOrDeclined) && item.censorId === self.appSession.userId) {
                            //   item.stt = stt;
                            //   stt++;
                            // } else {
                            //   item.stt = maxSTT;
                            //   maxSTT--;
                            // }
                        });

                        return {
                            data: response.items,

                            totalCount: response.totalCount,
                        };
                    })
                    .catch((error) => {

                        self.notify.error(self.l("DataLoadingFailed")); // throw 'Data Loading Error';
                    });
            },
            remove(key) {
                return self._leaveApplicationService
                    .delete(key)
                    .toPromise()
                    .then(() => {
                        return;
                    })
                    .catch((error) => {

                        self.notify.error(self.l("FailDeleted")); // throw 'Delete Error';
                    });
            },
        });
        console.log(self.dataSource);

    }
    isNotRevokeDeclineOrApprove(status: string) {
        return (
            status === LeaveApplicationStatusLabel.Approved ||
            status === LeaveApplicationStatusLabel.RevokedOrDeclined
        );
    }

    onStatusFilterChange(e) {
        this.clearSelection();
        this.selectedStatus = this.lstStatuses[e.itemIndex].value;
        // this.dataGrid.instance.pageIndex(0);
        this.getAll();
    }
    OnTextChange(event) {
        if (this.filterText.length === 0) {
            this.search();
        }
    }
    clearSelection() {
        this.dataGrid.instance.clearSelection();
        this.dataGrid.instance.option("focusedRowIndex", -1);
    }
    search() {
        this.clearSelection();

        this.filters = this.filterBox.getValue();
        localStorage.setItem('filters', JSON.stringify(this.filters))

        const localStorageFiltersString = localStorage.getItem('filters')
        const localStorageFiltersObj = JSON.parse(localStorageFiltersString)
        console.log(localStorageFiltersObj);


        console.log(this.filters);

        this.getAll();
    }

    refresh() {
        this.clearSelection();

        if (!isNil(this.filterBox)) {
            this.filterBox.reset();
            this.filters = this.filterBox.getValue();
        }

        // this.dataGrid.instance.pageIndex(0);
        this.getAll();
        this.initFormData();
    }

    onEditCompleted(id) {
        this.onEditUnitsCompleted.emit(id);
        this.viewDetailPopupVisible = false;
        this.dataGrid.instance.refresh();
        this.initFormData();
    }
    selectionChanged(data: any) {
        this.selectedItemKeys = data.selectedRowKeys;
        if (this.selectedItemKeys.length > 0) {
            this.selectHasData = false;
            this.leaveData = data.selectedRowsData
            this.arrCopyLeave = data.selectedRowKeys
        } else {
            this.selectHasData = true;
            this.leaveData = data.selectedRowsData
            this.arrCopyLeave = data.selectedRowKeys
        }
    }
    onApproval(e) {
        if (this.leaveData.length > 0) {
            swal.fire({
                title: this.l("Phê duyệt đơn nghỉ phép"),
                input: 'text',
                inputPlaceholder: 'Nhập ý kiến',
                showCancelButton: true,
                icon: "success",
                inputValidator: (value) => {
                    if (!value) {
                        return 'Bạn cần nhập ý kiến!'
                    }
                }
            }).then((result) => {
                if (result.value) {
                    this.loadingVisible = true;
                    this.leaveData.forEach(leave => {
                        this.updateLeaveApplicationStatusData.censorId = this.appSession.user.id;
                        this.updateLeaveApplicationStatusData.status = LeaveApplicationStatusValue.Approved;
                        this.updateLeaveApplicationStatusData.note = result.value.toString();
                        this.updateLeaveApplicationStatusData.approverId = this.appSession.user.id;
                        this.updateLeaveApplicationStatusData.approvedDate = moment();
                        this.updateLeaveApplicationStatusData.id = leave.id;
                        this.updateLeaveApplicationStatusData.subscriberId = leave.subscriberId;
                        this._leaveApplicationService
                            .updateLeaveApplicationStatus(
                                this.updateLeaveApplicationStatusData
                            )
                            .toPromise()
                            .then((rs) => {
                                const logs = new LeaveApplicationLogDto();
                                logs.leaveApplicationId = leave.id;
                                logs.approvedDate = moment();
                                logs.censorId = this.updateLeaveApplicationStatusData.censorId;
                                if (!isNil(result.value.toString())) {
                                    logs.note = JSON.stringify(result.value.toString());
                                } else {
                                    logs.note = LeaveApplicationHelper.getLeaveApplicationStatusByValue(LeaveApplicationStatusValue.Approved);
                                }
                                logs.status = this.updateLeaveApplicationStatusData.status;

                                logs.approverId = this.appSession.user.id;
                                this._leaveApplicationLogService
                                    .create(logs)
                                    .toPromise()
                                    .then((response: any) => {
                                    });
                                this.loadingVisible = false;
                                this.notify.success(this.l("Thành Công"));
                                this.dataGrid.instance.refresh();
                            })
                            .catch((error) => {
                                this.loadingVisible = false;
                                this.notify.error(("Xảy ra lỗi khi thực hiện phê duyệt"));
                            });
                    });
                }
            });
        } else {
            this.notify.error(("Chưa có đơn nghỉ nào được chọn!"));
        }

    }

    declineClick() {
        if (this.leaveData.length > 0) {
            swal.fire({
                title: this.l("Từ chối đơn nghỉ phép"),
                input: 'text',
                inputPlaceholder: 'Nhập ý kiến',
                showCancelButton: true,
                icon: "error",
                inputValidator: (value) => {
                    if (!value) {
                        return 'Bạn cần nhập ý kiến!'
                    }
                }
            }).then((result) => {
                if (result.value) {
                    this.loadingVisible = true;
                    this.leaveData.forEach(leave => {
                        this.updateLeaveApplicationStatusData.censorId = this.appSession.user.id;
                        this.updateLeaveApplicationStatusData.status = LeaveApplicationStatusValue.RevokedOrDeclined;
                        this.updateLeaveApplicationStatusData.note = result.value.toString();
                        this.updateLeaveApplicationStatusData.approverId = this.appSession.user.id;
                        this.updateLeaveApplicationStatusData.approvedDate = moment();
                        this.updateLeaveApplicationStatusData.id = leave.id;
                        this.updateLeaveApplicationStatusData.subscriberId = leave.subscriberId;
                        this._leaveApplicationService
                            .updateLeaveApplicationStatus(
                                this.updateLeaveApplicationStatusData
                            )
                            .toPromise()
                            .then((rs) => {
                                const logs = new LeaveApplicationLogDto();
                                logs.leaveApplicationId = leave.id;
                                logs.approvedDate = moment();
                                logs.censorId = this.updateLeaveApplicationStatusData.censorId;
                                if (!isNil(result.value.toString())) {
                                    logs.note = JSON.stringify(result.value.toString());
                                } else {
                                    logs.note = LeaveApplicationHelper.getLeaveApplicationStatusByValue(LeaveApplicationStatusValue.RevokedOrDeclined);
                                }
                                logs.status = this.updateLeaveApplicationStatusData.status;

                                logs.approverId = this.appSession.user.id;
                                this._leaveApplicationLogService
                                    .create(logs)
                                    .toPromise()
                                    .then((response: any) => {
                                    });
                                this.loadingVisible = false;
                                this.notify.success(this.l("Thành Công"));
                                this.dataGrid.instance.refresh();
                            })
                            .catch((error) => {
                                this.loadingVisible = false;
                                this.notify.error(("Xảy ra lỗi khi thực hiện từ chối"));
                            });
                    });
                }
            });
        } else {
            this.notify.error(("Chưa có đơn nghỉ nào được chọn!"));
        }
    }

    onClickBack() {
        // this.location.back();
        this.router.navigateByUrl("/app/leave-registration/leave-application");
    }
}
