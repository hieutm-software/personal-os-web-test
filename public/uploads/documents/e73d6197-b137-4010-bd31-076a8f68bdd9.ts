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
    CommonServiceServiceProxy,
    EmployeeAnnualLeaveDto,
    EmployeeAnnualLeaveServiceProxy,
    EmployeeInfoDto,
    EmployeeInfoServiceProxy,
    LeaveApplicationDto,
    LeaveApplicationServiceProxy,
    LeaveApplicationTypeDto,
    LeaveApplicationTypeServiceProxy,
} from "@shared/service-proxies/service-proxies";
import { DxDataGridComponent, DxFormComponent } from "devextreme-angular";
import CustomStore from "devextreme/data/custom_store";
import { isNil } from "lodash";
import * as moment from "moment";
import { LazyLoadEvent } from "primeng/api";
import {
    FilterCriteria,
    FilterLeaveApplicationComponent,
} from "./filter-leave-application/filter-leave-application.component";
import swal from "sweetalert2/src/sweetalert2.js";
import { Paginator } from "primeng/primeng";
import notify from "devextreme/ui/notify";
import { LeaveApplicationEditPopupComponent } from "./leave-application-edit-popup/leave-application-edit-popup.component";
import { NotifySignalrService } from "@app/shared/layout/notifications/notify-signalr.service";

@Component({
    selector: "leave-application",
    templateUrl: "./leave-application.component.html",
    styleUrls: ["./leave-application.component.css"],
    animations: [appModuleAnimation()],
})
export class LeaveApplicationComponent extends AppComponentBase {
    @ViewChild("dataGrid", { static: true }) dataGrid: DxDataGridComponent;
    @ViewChild("formFilter", { static: true }) formFilter: DxFormComponent;
    @ViewChild("filterBox", { static: false }) filterBox: FilterLeaveApplicationComponent; // div Filter
    @ViewChild("paginator", { static: true }) paginator: Paginator;
    @ViewChild(LeaveApplicationEditPopupComponent, { static: true })
    leaveApplicationEditPopup: LeaveApplicationEditPopupComponent;

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

    leaveApplicationData: LeaveApplicationDto = new LeaveApplicationDto();
    employeeAnnualLeaveData: EmployeeAnnualLeaveDto =
        new EmployeeAnnualLeaveDto();
    leaveApplicationTypeData: LeaveApplicationTypeDto =
        new LeaveApplicationTypeDto();
    employeeInfoData: EmployeeInfoDto = new EmployeeInfoDto();
    screenHeight: any;
    currentYear: number;
    lastYear: number;

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
            value: 0,
            text: LeaveApplicationStatusLabel.All,
            type: "default",
        },
        {
            value: 1,
            text: "Cấp xem xét",
            type: "default",
        },
        {
            value: 2,
            text: "Cấp kiểm tra",
            type: "default",
        },
        {
            value: 3,
            text: "Cấp thông qua",
            type: "default",
        },
        {
            value: 4,
            text: "Cấp phê duyệt",
            type: "default",
        },
        {
            value: 5,
            text: "Đã phê duyệt",
            type: "default",
        },
        {
            value: 6,
            text: "Từ chối",
            type: "default",
        },
    ];

    constructor(
        injector: Injector,
        private router: Router,
        private _leaveApplicationService: LeaveApplicationServiceProxy,
        private _commonService: CommonServiceServiceProxy,
        private _employeeAnnualLeaveService: EmployeeAnnualLeaveServiceProxy,
        private _leaveApplicationTypeService: LeaveApplicationTypeServiceProxy,
        private _employeeInfoService: EmployeeInfoServiceProxy, // private _uerService
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

        // this.advancedFiltersAreShown = false;
        this.selectedStatus = LeaveApplicationStatusValue.All;
        this.filters = {
            leaveApplicationTypeId: null,
            departmenId: null,
            // userId: this.appSession.userId,
            userId: null,
            status: "",
            fromDate: null,
            toDate: null,
        };

        // get list of status based on user role
        const lsSelectedStatus = [];
        this.mapStatusPermission.forEach((v, k) => {
            if (this.isGranted(k)) {
                lsSelectedStatus.push(v);
            }
        });

        this.lstStatuses = [
            {
                value: 0,
                text: LeaveApplicationStatusLabel.All,
                type: "default",
            },
        ];
        // this._commonService.getListOfValue('STATUSLEAVE', this.appSession.tenantId).subscribe(result => {
        //         result.forEach((item) => {
        //             var statusNew = {
        //                 value: parseInt(item.value),
        //                 text: item.displayText,
        //                 type: "default",
        //             }
        //             this.lstStatuses.push(statusNew);
        //         });
        // });

        this.allStatus.forEach((item) => {
            if (lsSelectedStatus.indexOf(item.value) > -1) {
                //item.type = "default";
                this.lstStatuses.push(item);
            }
        });

        this.canEdit(this.appSession.userId);
        this.initFormData();
        this.getAll();

        this.allowDeleting = this.allowDeleting.bind(this);
        this.allowUpdating = this.allowUpdating.bind(this);

        // this.allowUpdatingByUser = this.allowUpdatingByUser.bind(this);
        this.onView = this.onView.bind(this);
        this.checkLeave = this.checkLeave.bind(this);
        // this.onEditHalfDayLeave = this.onEditHalfDayLeave.bind(this);
        this.onEdit = this.onEdit.bind(this);
        this.onDelete = this.onDelete.bind(this);
        this.onFilterButtonClick = this.onFilterButtonClick.bind(this);
        this.onClearButtonClick = this.onClearButtonClick.bind(this);
        // this.onExportButtonClick = this.onExportButtonClick.bind(this);


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
                && !this.isNotRevokeDeclineOrApprove(e.row.data.status, e.row.data.isComplete)
                && this.appSession.user.id === e.row.data.subscriberId)
            || (this.isGranted("Pages.LeaveRegistration.LeaveApplication.Delete")
                && e.row.data.approvedDate >= this.approvedDateValue
                && e.row.data.isComplete === true)
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
                && !this.isNotRevokeDeclineOrApprove(e.row.data.status, e.row.data.isComplete)
                && this.appSession.user.id === e.row.data.subscriberId)
            || (this.isGranted("Pages.LeaveRegistration.LeaveApplication.EditAfterPassed")
                && e.row.data.approvedDate >= this.approvedDateValue
                && e.row.data.isComplete === true
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
        if (e.rowType === "data") {
            if (
                (e.data.censorId === this.appSession.userId || e.data.authorizedByUserId === this.appSession.userId) &&
                e.data.subscriberId !== this.appSession.userId &&
                e.data.isComplete !== true &&
                e.data.status !== -1
            ) {
                e.cellElement.style.backgroundColor = "rgb(92 149 197)";
            }
        }
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
                    .getLeaveApplications(
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
    // filterByText() {
    //   this.dataGrid.instance.searchByText(this.filterText);
    // }

    create() {
        // this._leaveApplicationService.sendNoify().toPromise().then(rs => {})
        // this._NotifySignalrService.sendMessage();
        this.router.navigateByUrl(
            "/app/leave-registration/leave-application/create"
        );
    }
    onEdit(e) {
        // if (this.isNotHalfDayOff(e)) {

        //     this.router.navigateByUrl(
        //         "/app/leave-registration/leave-application/edit/" +
        //         e.row.data.id
        //     );
        // } else {
        //     this.leaveApplicationEditPopup.leaveApplicationId = e.row.data.id;
        //     this.leaveApplicationEditPopup.readOnly = false;
        //     this.leaveApplicationEditPopup.initFormData();
        //     this.leaveApplicationEditPopup.show();
        // }
        this.router.navigateByUrl(
            "/app/leave-registration/leave-application/edit/" +
            e.row.data.id
        );
    }
    onView(e) {


        // if (this.isNotHalfDayOff(e)) {
        //     this.router.navigateByUrl(
        //         "/app/leave-registration/leave-application/view-details/" +
        //         e.row.data.id
        //     );
        // } else {
        //     this.leaveApplicationEditPopup.leaveApplicationId = e.row.data.id;
        //     this.leaveApplicationEditPopup.readOnly = true;
        //     this.leaveApplicationEditPopup.initFormData();
        //     this.leaveApplicationEditPopup.show();
        // }

        this.router.navigateByUrl(
            "/app/leave-registration/leave-application/view-details/" +
            e.row.data.id
        );
    }
    createLeave() {
        // this.leaveApplicationEditPopup.readOnly = false;
        // this.leaveApplicationEditPopup.isVisible = true;
        // this.leaveApplicationEditPopup.leaveApplicationId = null;
        // this.leaveApplicationEditPopup.employeeAnnualLeaveData =
        //     this.employeeAnnualLeaveData;
        // this.leaveApplicationEditPopup.initFormData();
        // this.leaveApplicationEditPopup.show();
    }
    checkLeave(e) {
      this.leaveApplicationEditPopup.show();
    }
    // onEditHalfDayLeave(e) {
    //   this.leaveApplicationEditPopup.leaveApplicationId = e.row.data.id;
    //   this.leaveApplicationEditPopup.readOnly = false;
    //   this.leaveApplicationEditPopup.initFormData();
    //   this.leaveApplicationEditPopup.show();
    // }
    // onEditNuaPhep(e) {
    //   this.leaveApplicationEditPopup.leaveApplicationId = e.row.data.id;
    //   this.leaveApplicationEditPopup.readOnly = false;
    //   this.leaveApplicationEditPopup.initFormData();
    //   this.leaveApplicationEditPopup.show();
    // }
    onDelete(e) {
        swal.fire({
            title: this.l("Xóa đơn nghỉ phép"),
            input: 'text',
            inputPlaceholder: 'Nhập lý do vào đây',
            showCancelButton: true,
            icon: "warning",
            inputValidator: (value) => {
                if (!value) {
                    return 'Bạn cần viết lý do xóa!'
                }
            }
            // swal.fire({
            //     title: this.l("Xóa đơn nghỉ phép"),
            //     text: this.l(
            //         "Chắc chắn muốn xóa đơn nghỉ phép của " +
            //         e.row.data.subcriberName +
            //         "?"
            //     ),
            //     icon: "warning",
            //     showCancelButton: true,
            //     confirmButtonText: this.l("Yes"),
            //     cancelButtonText: this.l("Cancel"),
        }).then((result) => {


            if (result.value) {
                // this.leaveAppId = Number(e.row.data.id);
                this._leaveApplicationService.getById(e.row.data.id)
                    .toPromise()
                    .then((res: any) => {
                        this.leaveApplicationData = res;
                        this.leaveApplicationData.reasonDelete = result.value.toString();

                        this._leaveApplicationService
                            .updateReasonDelete(this.leaveApplicationData)
                            .toPromise()
                            .then((response: any) => {
                                this._leaveApplicationService
                                    .delete(e.row.data.id)
                                    .subscribe((result) => {
                                        if (result) {
                                            //Chuyen doi sang cach goi mang => dung code cua leaveAppType de tru di phep nua ngay cho dung.
                                            this._leaveApplicationTypeService
                                                .getById(e.row.data.applicationTypeId)
                                                .subscribe((result) => {
                                                    this.leaveApplicationTypeData = result;
                                                    ;
                                                    this._employeeInfoService
                                                        .getBySubscriberEmail(
                                                            e.row.data.subcriberEmail
                                                        )
                                                        .subscribe((result) => {
                                                            const employeeInfo = result;
                                                            this._employeeAnnualLeaveService
                                                                .getAnuualByEmployeeId(this.appSession.user.id, employeeInfo.employeeId)
                                                                .subscribe((result) => {
                                                                    const employeeAnnualleave =
                                                                        result;

                                                                    ;
                                                                    if (
                                                                        (this.leaveApplicationTypeData.code === "P"
                                                                            || this.leaveApplicationTypeData.code === "P/2"
                                                                            || this.leaveApplicationTypeData.code === "PKL") &&
                                                                        (e.row.data.status === LeaveApplicationStatusLabel.Approved)
                                                                    ) {
                                                                        if (this.leaveApplicationTypeData.code === "PKL") {
                                                                            employeeAnnualleave.daysUsed -= 0.5;
                                                                            employeeAnnualleave.daysLeft += 0.5;
                                                                            employeeAnnualleave.annualLeaveThisYearUsed -= 0.5;
                                                                        } else {
                                                                            employeeAnnualleave.daysUsed -= Number(e.row.data.numberOfDayOff);
                                                                            employeeAnnualleave.daysLeft += Number(e.row.data.numberOfDayOff);
                                                                            employeeAnnualleave.annualLeaveThisYearUsed -= Number(e.row.data.numberOfDayOff);
                                                                        }
                                                                        if (employeeAnnualleave.daysUsed < 0) {
                                                                            employeeAnnualleave.daysUsed = 0;
                                                                        }
                                                                        if (
                                                                            employeeAnnualleave.daysUsed <=
                                                                            employeeAnnualleave.annualLeaveLastYear
                                                                        ) {
                                                                            employeeAnnualleave.annualLeaveThisYearUsed = 0;
                                                                        }

                                                                        // if (
                                                                        //     this
                                                                        //         .employeeAnnualLeaveData
                                                                        //         .daysUsed >
                                                                        //     this
                                                                        //         .employeeAnnualLeaveData
                                                                        //         .annualLeaveLastYear
                                                                        // ) {
                                                                        //     this.employeeAnnualLeaveData.annualLeaveThisYearUsed =
                                                                        //         this
                                                                        //             .employeeAnnualLeaveData
                                                                        //             .daysUsed -
                                                                        //         this
                                                                        //             .employeeAnnualLeaveData
                                                                        //             .annualLeaveLastYear;
                                                                        // } else if (
                                                                        //     this
                                                                        //         .employeeAnnualLeaveData
                                                                        //         .daysUsed <=
                                                                        //         this
                                                                        //             .employeeAnnualLeaveData
                                                                        //             .annualLeaveLastYear &&
                                                                        //     moment().month() > 2
                                                                        // ) {
                                                                        //     this.employeeAnnualLeaveData.annualLeaveThisYearUsed = 0;
                                                                        // }

                                                                        this._employeeAnnualLeaveService
                                                                            .update(
                                                                                employeeAnnualleave
                                                                            )
                                                                            .toPromise()
                                                                            .then(
                                                                                (
                                                                                    response: any
                                                                                ) => {
                                                                                    ;
                                                                                }
                                                                            );
                                                                    }
                                                                });
                                                        });
                                                });
                                            this.clearSelection();
                                            this.dataGrid.instance.refresh();
                                            // this.getAll();
                                            this.initFormData();
                                            this.notify.success(this.l("SuccessfullyDeleted"));
                                        } else {
                                            this.notify.error(this.l("FailDeleted"));
                                        }
                                        // this.reloadPage();
                                    });
                            });
                    });




            }
        });
    }
    // reloadPage(): void {
    //   // this.dataGrid.instance.pageIndex(0);
    //   this.getAll();
    //   this.initFormData();
    //   // this.paginator.changePage(0);
    // }
    isNotRevokeDeclineOrApprove(status: number, isComplete: boolean) {
        return (
            status === -1 ||
            isComplete === true
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
        // }
        // else {
        //   this.filterByText();
        // }
        // this.filterByText();
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
    fastApproval() {
        this.router.navigateByUrl("/app/leave-registration/leave-application/fast-approval");
    }
}
