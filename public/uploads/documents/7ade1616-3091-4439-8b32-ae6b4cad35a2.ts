import { Component, Injector, OnInit } from "@angular/core";
import { AppComponentBase } from "@shared/common/app-component-base";
import {
    CommonServiceServiceProxy,
    ERPComboboxItem,
} from "@shared/service-proxies/service-proxies";
import ArrayStore from "devextreme/data/array_store";
import moment from "moment";

export class FilterCriteria {
    leaveApplicationTypeId: number; // Loai nghi phep
    departmenId: string;
    status: string; // trang thai
    userId: number; // Nguoi dang ky
    // approverName: number; // Nguoi phe duyet
    fromDate: any; // Ngày dang ky - từ ngày
    toDate: any; // Ngày dang ky- đến ngày
}

@Component({
    selector: "filter-leave-application",
    templateUrl: "./filter-leave-application.component.html",
    styleUrls: ["./filter-leave-application.component.css"],
})
export class FilterLeaveApplicationComponent extends AppComponentBase {
    filterCriteria: FilterCriteria;
    dataDepartment: any;

    departmentValue: string[] = [];
    dataUser: any;
    dataApplicationType: any;
    constructor(
        injector: Injector,
        private _commonService: CommonServiceServiceProxy
    ) {
        super(injector);
    }

    ngOnInit() {
        const emptyItem: ERPComboboxItem = new ERPComboboxItem();
        emptyItem.value = null;
        emptyItem.displayText = "";

        this._commonService
            .getLookups(
                "LeaveApplicationType",
                this.appSession.tenantId,
                undefined
            )
            .subscribe((result) => {
                result.unshift(emptyItem);
                this.dataApplicationType = new ArrayStore({
                    data: result,
                    key: "value",
                });
            });

        this._commonService
            .getLookups("Department", this.appSession.tenantId, undefined)
            .subscribe((result) => {
                result.unshift(emptyItem);
                this.dataDepartment = new ArrayStore({
                    data: result,
                    key: "value",
                });
            });

        this._commonService
            .getLookups("UsersFullName", this.appSession.tenantId, undefined)
            .subscribe((result) => {
                result.unshift(emptyItem);
                this.dataUser = new ArrayStore({
                    data: result,
                    key: "value",
                });
            });

        this.onValueChangedUser = this.onValueChangedUser.bind(this);
        this.onValueChangedApplicationType =
            this.onValueChangedApplicationType.bind(this);
        this.onValueChangedDepartment =
            this.onValueChangedDepartment.bind(this);
        // this.reset();
        this.initFilter();
        // TEST
        const localStorageFiltersString = localStorage.getItem('filters')
        const localStorageFiltersObj = JSON.parse(localStorageFiltersString)
        console.log(localStorageFiltersObj);
        if (localStorageFiltersObj) {
            this.filterCriteria = localStorageFiltersObj
            localStorage.removeItem('filters')
        }
    }
    reset() {
        this.departmentValue = [];
        this.filterCriteria = {
            leaveApplicationTypeId: null,
            departmenId: null,
            userId: null,
            status: "",
            fromDate: null,
            toDate: null,
        };
    }
    initFilter() {
        this.filterCriteria = {
            leaveApplicationTypeId: null,
            departmenId: null,
            userId: null,
            status: "",
            fromDate: moment().format("LL"),
            toDate: null,
        };
    }
    getValue() {
        return this.filterCriteria;
    }
    onValueChangedApplicationType(e) {
        this.filterCriteria.leaveApplicationTypeId = e.value;
    }
    onValueChangedDepartment(e) {
        this.filterCriteria.departmenId = e.value;
    }
    onValueChangedUser(e) {
        this.filterCriteria.userId = e.value;
        console.log(e.value);

    }
}
