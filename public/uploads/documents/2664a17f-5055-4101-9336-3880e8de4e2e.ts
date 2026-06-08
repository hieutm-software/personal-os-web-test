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
import { appModuleAnimation } from "@shared/animations/routerTransition";
import { AppComponentBase } from "@shared/common/app-component-base";
import {
    LeaveApplicationButtonActionValue,
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
    ERPComboboxItem,
    LeaveApplicationDto,
    LeaveApplicationLogDto,
    LeaveApplicationLogServiceProxy,
    LeaveApplicationServiceProxy,
    LeaveApplicationTypeDto,
    LeaveApplicationTypeServiceProxy,
    LeaveNotApprovelDto,
    UpdateStatusLeaveApplicationDto,
} from "@shared/service-proxies/service-proxies";
import { DxDataGridComponent, DxFormComponent } from "devextreme-angular";
import ArrayStore from "devextreme/data/array_store";
import CustomStore from "devextreme/data/custom_store";
import { forEach, isNil } from "lodash";
import moment from "moment";
import { FilterCriteria, FilterLeaveApplicationComponent } from "../filter-leave-application/filter-leave-application.component";
import themes from 'devextreme/ui/themes';
import swal from 'sweetalert2/src/sweetalert2.js';

@Component({
    selector: "app-leave-application-edit-popup",
    templateUrl: "./leave-application-edit-popup.component.html",
    styleUrls: ["./leave-application-edit-popup.component.css"],
    animations: [appModuleAnimation()],
})
export class LeaveApplicationEditPopupComponent extends AppComponentBase {
    @ViewChild("dataGrid", { static: true }) dataGrid: DxDataGridComponent;
    @Output() onEditUnitsCompleted = new EventEmitter<any>();
    @Input() leaveApplicationId: number;
    @Input() employeeAnnualLeaveData: EmployeeAnnualLeaveDto = new EmployeeAnnualLeaveDto();
    @ViewChild("formFilter", { static: true }) formFilter: DxFormComponent;
    @ViewChild("filterBox", { static: false }) filterBox: FilterLeaveApplicationComponent; // div Filter

    employeeInfoData: EmployeeInfoDto = new EmployeeInfoDto();
    leaveApplicationData: LeaveApplicationDto = new LeaveApplicationDto();
    leaveApplicationTypeData: LeaveApplicationTypeDto =
        new LeaveApplicationTypeDto();
    updateLeaveApplicationStatusData: UpdateStatusLeaveApplicationDto =
        new UpdateStatusLeaveApplicationDto();
    // lstLeaveApplicationType: ERPComboboxItem[] = [];
    dataLeaveApplicationType: any;
    numberOfDayOffData: any;
    lstNumberOfDayOff: any[] = [];
    popupVisible = false;
    leaveApplicationTypeValue: number;
    numberOfDayOffValue: number;
    titlePopup = "";
    fromDateValue: any;
    toDateValue: any;
    weekendCounter: number;
    isWeekend = false;
    readOnly = false;
    isVisible = false;
    isCensorView = false;
    isCensorAction = false;
    isApproved = false;
    censorValue: number;
    dataCensor: any;

    dataSource: any;
    selectedStatus: number;
    lstStatuses: any[];
    allMode: string;
    checkBoxesMode: string;
    selectedItemKeys: any[] = [];
    leaveNotApprovelData: LeaveNotApprovelDto[] = [];

    filterText = "";
    filters: FilterCriteria;

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
        private _commonService: CommonServiceServiceProxy,
        private _leaveApplicationService: LeaveApplicationServiceProxy,
        private _leaveApplicationTypeService: LeaveApplicationTypeServiceProxy,
        private _leaveApplicationLogService: LeaveApplicationLogServiceProxy,
        private _employeeAnnualLeaveService: EmployeeAnnualLeaveServiceProxy,
        private _employeeInfoService: EmployeeInfoServiceProxy,
        private router: Router
    ) {
        super(injector);
    }

    show() {
        this.popupVisible = true;
        this.getAll()
    }
    ngOnInit() {
        this.selectedStatus = LeaveApplicationStatusValue.All;
        this.filters = {
            leaveApplicationTypeId: null,
            departmenId: null,
            userId: null,
            status: "",
            fromDate: null,
            toDate: null,
        };
        this.onFilterButtonClick = this.onFilterButtonClick.bind(this);
        // get list of status based on user role
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
                //item.type = "default";
                this.lstStatuses.push(item);
            }
        });
        this.allMode = 'allPages';
        this.checkBoxesMode = themes.current().startsWith('material') ? 'always' : 'always';
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
                    .getLeaveNotApproved(
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

        e.toolbarOptions.items.unshift({
            location: "after",
            widget: "dxButton",
            options: {
                icon: "email",
                text: this.l("Gửi mail thông báo"),
                stylingMode: "contained",
                type: "default",
                onClick: this.saveButtonClick.bind(this),
            },
        });

        e.toolbarOptions.items.unshift({
            location: "after",
            widget: "dxButton",
            options: {
                icon: "search",
                stylingMode: "contained",
                type: "default",
                onClick: this.search.bind(this),
            },
        });
    }
    onCellPrepared(e) {

        // if (e.rowType === "header" && e.column.caption == "Thao tác") {
        //     // e.cellElement.style.textAlign = 'right';
        //     e.cellElement.style.color = "#959595";
        // }
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

    saveButtonClick(e) {
        // swal.fire({
        //     title: this.l('Đồng ý gửi mail cho NLĐ'),
        //     icon: 'warning',
        //     showCancelButton: true,
        //     confirmButtonText: this.l('Yes'),
        //     cancelButtonText: this.l('Cancel'),
        // }).then((result) => {
        //     if (result.value) {
        //         console.log(this.leaveNotApprovelData);
        //         if (this.leaveNotApprovelData.length <= 0) {
        //             this.notify.error(this.l("Chưa có bản ghi nào được chọn"));
        //             return;
        //         } else {
        //             this.leaveNotApprovelData.forEach(leave => {
        //                 leave.status = LeaveApplicationHelper.getLeaveApplicationStatusByText(leave.status);
        //                 this._leaveApplicationService.leaveNotApprovalSendMail(leave)
        //                     .toPromise()
        //                     .then()
        //                     .catch((error) => {
        //                         this.notify.error(this.l("Gửi mail thất bại"));
        //                     });
        //             });
        //             this.dataGrid.instance.refresh();
        //             this.popupVisible = false;
        //         }
        //     }
        // });

        console.log(this.leaveNotApprovelData);
        if (this.leaveNotApprovelData.length <= 0) {
            this.notify.error(this.l("Chưa có bản ghi nào được chọn"));
            return;
        } else {
            this.leaveNotApprovelData.forEach(leave => {
                leave.status = LeaveApplicationHelper.getLeaveApplicationStatusByText(leave.status);
                this._leaveApplicationService.leaveNotApprovalSendMail(leave)
                    .toPromise()
                    .then(() => {
                        this.notify.success(this.l("Thành Công"));
                        this.dataGrid.instance.refresh();
                        this.popupVisible = false;
                    })
                    .catch((error) => {
                        this.notify.error(this.l("Gửi mail thất bại"));
                    });
            });
            
        }
    }

    onStatusFilterChange(e) {
        this.clearSelection();
        this.selectedStatus = this.lstStatuses[e.itemIndex].value;
        // this.dataGrid.instance.pageIndex(0);
        this.getAll();
    }
    clearSelection() {
        this.dataGrid.instance.clearSelection();
        this.dataGrid.instance.option("focusedRowIndex", -1);
    }

    selectionChanged(data: any) {
        this.selectedItemKeys = data.selectedRowKeys;
        if (this.selectedItemKeys.length > 0) {
            this.leaveNotApprovelData = data.selectedRowsData
        } else {
            this.leaveNotApprovelData = data.selectedRowsData
        }
    }

    onFilterButtonClick(e) {
        this.getAll();
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
}
