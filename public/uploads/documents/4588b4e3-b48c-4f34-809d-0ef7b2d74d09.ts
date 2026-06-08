import {
    Component,
    HostListener,
    Injector,
    OnInit,
    ViewChild,
} from "@angular/core";
import { appModuleAnimation } from "@shared/animations/routerTransition";
import { AppComponentBase } from "@shared/common/app-component-base";
import {
    LeaveApplicationHelper,
    LeaveApplicationStatusLabel,
    LeaveApplicationStatusValue,
} from "@shared/helpers/LeaveApplicationHelper";
import { LeaveApplicationServiceProxy } from "@shared/service-proxies/service-proxies";
import { DxDataGridComponent, DxFormComponent } from "devextreme-angular";
import CustomStore from "devextreme/data/custom_store";
import { isNil } from "lodash";
import moment from "moment";
import {
    FilterLeaveApplicationComponent,
    FilterCriteria,
} from "../leave-application/filter-leave-application/filter-leave-application.component";

@Component({
  selector: 'leave-application-management',
  templateUrl: './leave-application-management.component.html',
  styleUrls: ['./leave-application-management.component.css'],
  animations: [appModuleAnimation()],
})
export class LeaveApplicationManagementComponent extends AppComponentBase {
    @ViewChild("filterBox", { static: false })
    filterBox: FilterLeaveApplicationComponent; // div Filter
    @ViewChild("formFilter", { static: true }) formFilter: DxFormComponent;
    @ViewChild("dataGrid", { static: true }) dataGrid: DxDataGridComponent;
    filters: FilterCriteria;
    dataSource: any;
    dataSourceReport: any;
    selectedStatus: number;
    lstStatuses: any[];
    lstApprovedLeaveApplication: any[];
    lstOthersLeaveApplication: any[];
    totalleaveApplication: number;
    totalApprovedleaveApplication: number;
    totalDeclinedleaveApplication: number;
    totalNotApproveleaveApplication: number;
    screenHeight: any;

    currentDate = moment().format("dd/mm/yyyy");

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
        // ['Pages.LeaveRegistration.LeaveApplication.Status.Revoked', LeaveApplicationStatusValue.RevokedOrDeclined],
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
        private _leaveApplicationService: LeaveApplicationServiceProxy
    ) {
        super(injector);
        this.screenHeight = window.innerHeight;
    }

    @HostListener("window:resize", ["$event"])
    onResize(event) {
        this.screenHeight = window.innerHeight;
    }

    ngOnInit() {
        const lsSelectedStatus = [];
        this.mapStatusPermission.forEach((v, k) => {
            if (this.isGranted(k)) {
                lsSelectedStatus.push(v);
            }
        });

        this.selectedStatus = LeaveApplicationStatusValue.All;

        // this.filterBox.initFilter();
        this.filters = {
            leaveApplicationTypeId: null,
            departmenId: null,
            // userId: this.appSession.userId,
            userId: null,
            status: "",
            fromDate: moment().format("LL"),
            toDate: null,
        };

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

        this.getAll();
        this.getReportApplication();
        // this.onFilterButtonClick = this.onFilterButtonClick.bind(this);
        this.onClearButtonClick = this.onClearButtonClick.bind(this);
    }

    getAll() {
        const self = this;

        self.dataSource = {};
        self.dataSource.store = new CustomStore({
            key: "id",
            load(loadOptions: any) {
                const maxResultCount = loadOptions.take || 10;
                const skipCount = loadOptions.skip || 0;
                const sorting = "FromDate asc"; //creationTime desc
                let stt = 0;

                // self.totalApprovedleaveApplication = 0;
                // self.totalDeclinedleaveApplication = 0;
                // self.totalNotApproveleaveApplication = 0;

                return self._leaveApplicationService
                    .getLeaveApplications(
                        "",
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
                            ++stt;
                            item.stt = stt;

                            item.status =
                                LeaveApplicationHelper.getLeaveApplicationStatusByValue(
                                    item.status
                                );
                        });
                        return {
                            data: response.items,
                            totalCount: response.totalCount,
                        };
                    })
                    .catch((error) => {
                        console.log(error);
                        self.notify.error(self.l("DataLoadingFailed")); // throw 'Data Loading Error';
                    });
            },
        });
    }

    getReportApplication() {
        this.totalleaveApplication = 0;
        this.totalApprovedleaveApplication = 0;
        this.totalDeclinedleaveApplication = 0;
        this.totalNotApproveleaveApplication = 0;

        this._leaveApplicationService
            .getLeaveApplitionForReport(
                this.filters.leaveApplicationTypeId,
                this.filters.departmenId,
                this.selectedStatus,
                this.filters.userId,
                !isNil(this.filters.fromDate)
                    ? moment(this.filters.fromDate)
                    : undefined,
                !isNil(this.filters.toDate)
                    ? moment(this.filters.toDate)
                    : undefined
            )
            .toPromise()
            .then((result) => {
                console.log("getReportApplication:result-------", result);
                result.forEach((item) => {
                    ++this.totalleaveApplication;

                    if (item.status === LeaveApplicationStatusValue.Approved)
                        this.totalApprovedleaveApplication++;
                    else if (
                        item.status ===
                        LeaveApplicationStatusValue.RevokedOrDeclined
                    )
                        this.totalDeclinedleaveApplication++;
                    else this.totalNotApproveleaveApplication++;
                });
            });
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
    // onFilterButtonClick(e) {
    //   this.getAll();
    // }

    onClearButtonClick(e) {
        this.formFilter.instance.resetValues();
    }

    onStatusFilterChange(e) {
        this.selectedStatus = this.lstStatuses[e.itemIndex].value;
        // this.dataGrid.instance.pageIndex(0);
        this.getAll();
        this.getReportApplication();
    }
    search() {
        this.dataGrid.instance.clearSelection();
        this.dataGrid.instance.option("focusedRowIndex", -1);
        this.filters = this.filterBox.getValue();
        this.getAll();
        this.getReportApplication();
    }

    refresh() {
        if (!isNil(this.filterBox)) {
            this.filterBox.reset();
            this.filters = this.filterBox.getValue();
        }

        this.getAll();
        this.getReportApplication();
    }
}
