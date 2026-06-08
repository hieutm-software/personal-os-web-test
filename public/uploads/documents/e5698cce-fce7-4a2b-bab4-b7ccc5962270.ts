import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, HostListener, Injector, Input, Output, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { appModuleAnimation } from '@shared/animations/routerTransition';
import { AppComponentBase } from '@shared/common/app-component-base';
import { CommonServiceServiceProxy, LeaveApplicationReasonDto, LeaveApplicationReasonServiceProxy, MobileTokenServiceProxy } from '@shared/service-proxies/service-proxies';
import { DxDataGridComponent, DxFormComponent } from 'devextreme-angular';
import CustomStore from 'devextreme/data/custom_store';
import { custom } from 'devextreme/ui/dialog';
import { Table } from 'primeng/components/table/table';
import { FileUpload, Paginator } from 'primeng/primeng';
import swal from 'sweetalert2/src/sweetalert2.js';
import { LeaveApplicationReasonEditPopupComponent } from './leave-application-reason-edit-popup/leave-application-reason-edit-popup.component';

@Component({
    selector: 'leave-application-reason',
    templateUrl: './leave-application-reason.component.html',
    styleUrls: ['./leave-application-reason.component.css'],
    animations: [appModuleAnimation()],
})
export class LeaveApplicationReasonComponent extends AppComponentBase {
    @ViewChild('dataGrid', { static: true }) dataGrid: DxDataGridComponent;
    @ViewChild('formFilter', { static: true }) formFilter: DxFormComponent;
    @ViewChild('dataTable', { static: true }) dataTable: Table;
    @ViewChild('paginator', { static: true }) paginator: Paginator;
    @ViewChild('ExcelFileUpload', { static: true }) excelFileUpload: FileUpload;
    @ViewChild(LeaveApplicationReasonEditPopupComponent, { static: true }) leaveApplicationReasonEditPopup: LeaveApplicationReasonEditPopupComponent;

    @Input() leaveApplicationReasonId: number;
    @Output() onEditUnitsCompleted = new EventEmitter<any>();

    lstStatuses: any[];
    lstHalfDayOff: any[];
    lstHasApprove: any[];
    // uploadUrl: string;

    //Filters
    advancedFiltersAreShown = false;
    filterText = '';

    dataSource: any;

    viewAll = false;

    allowEdit = false;
    allowDelete = false;
    activeWorkId: number;
    screenHeight: any;

    leaveApplicationReasonData: LeaveApplicationReasonDto;

    toDay = new Date();

    constructor(
        injector: Injector,
        private _leaveApplicationReasonServiceProxy: LeaveApplicationReasonServiceProxy,
        private _activatedRoute: ActivatedRoute,
        private _commonService: CommonServiceServiceProxy,
        private _httpClient: HttpClient
    ) {
        super(injector);
        this.screenHeight = window.innerHeight;
        this.filterText = this._activatedRoute.snapshot.queryParams['filterText'] || '';
        // this.uploadUrl = AppConsts.remoteServiceBaseUrl + '/Users/ImportFromExcel';

        this.getLeaveApplicationReasons();
        this.onEditLeaveApplicationReason = this.onEditLeaveApplicationReason.bind(this);
        this.onViewLeaveApplicationReason = this.onViewLeaveApplicationReason.bind(this);
        this.onDelete = this.onDelete.bind(this);

        this.allowDeleting = this.allowDeleting.bind(this);
        this.allowUpdating = this.allowUpdating.bind(this);
        this.onFilterButtonClick = this.onFilterButtonClick.bind(this);
        this.onClearButtonClick = this.onClearButtonClick.bind(this);

    }
    @HostListener('window:resize', ['$event'])
    onResize(event) {
        this.screenHeight = window.innerHeight;
    }
    ngOnInit(): void {
        abp.event.trigger('urlChanged');
        this.lstStatuses = [{ value: true, text: 'Hoạt động' }, { value: false, text: 'Không hoạt động' }];
        this.lstHalfDayOff = [{ value: true, text: 'Nửa ngày' }, { value: false, text: 'Cả ngày' }];
        this.lstHasApprove = [{ value: true, text: 'Cần phê duyệt' }, { value: false, text: 'Không cần phê duyệt' }]
    }

    search(event) {
        this.filterText = event;
        this.getLeaveApplicationReasons();
    }

    isNotEmpty(value: any): boolean {
        return value !== undefined && value !== null && value !== "";
    }

    getLeaveApplicationReasons() {
        const self = this;
        self.dataSource = {};
        self.dataSource.store = new CustomStore({
            key: "id",
            load(loadOptions: any) {
                const maxResultCount = loadOptions.take || 10;
                const skipCount = loadOptions.skip || 0;
                const sorting = "Title"; //creationTime desc

                return self._leaveApplicationReasonServiceProxy
                    .getAll(
                        self.filterText,
                        sorting,
                        maxResultCount,
                        skipCount
                    )
                    .toPromise()
                    .then((response: any) => {
                        console.log(response);
                        response.items.forEach((item: any, index: number) => {
                            item['STT'] = index + 1;
                        });
                        return {
                            data: response.items,
                            totalCount: response.totalCount
                        };
                    })
                    .catch(error => {
                        console.log(error);
                        self.notify.error(self.l('DataLoadingFailed'));// throw 'Data Loading Error';
                    });
            },
            remove(key) {
                return self._leaveApplicationReasonServiceProxy.delete(key)
                    .toPromise()
                    .then(() => {
                        return Promise.resolve();
                    })
                    .catch(error => {
                        console.log(error);
                        self.notify.error(self.l('FailDeleted'));// throw 'Delete Error';
                    });
            }
        });
    }
    onCellPrepared(e) {
        if (e.rowType === 'header' && e.columnIndex == 6) {
            // e.cellElement.style.textAlign = 'right';
            e.cellElement.style.color = '#959595';
        }
    }

    getAllInPage() {
        this.paginator.rows = this.primengTableHelper.totalRecordsCount;
        //   this.getUsers();
        this.getLeaveApplicationReasons();
    }

    allowDeleting(e) {
        return this.isGranted('Pages.LeaveRegistration.LeaveApplicationReason.Delete');
    }

    allowUpdating(e) {
        return this.isGranted('Pages.LeaveRegistration.LeaveApplicationReason.Edit');
    }

    deleteButtonClick(e) {
        const messge = custom({
            title: this.l('AreYouSure'),
            messageHtml: this.l('DeleteWarningMessage'),
            buttons: [{
                text: this.l('Delete'),
                stylingMode: "contained",
                type: "danger",
                onClick: (e) => {
                    return { result: "YES" }
                },
            },
            {
                text: this.l('No'),
                stylingMode: "contained",
                type: "default",
                onClick: (e) => {
                    return { result: "NO" }
                },
            },
            ]
        });

        messge.show().then((dialog) => {
            if (dialog.result === "YES") {
                this._leaveApplicationReasonServiceProxy.delete(this.leaveApplicationReasonId)
                    .toPromise()
                    .then(() => {
                        this.dataGrid.instance.refresh();
                    })
                    .catch(error => {
                        console.log(error);
                        this.notify.error(this.l('FailDeleted'));// throw 'Delete Error';
                    });
            }
        });
    }

    editButtonClick(e) {
        this.dataGrid.instance.byKey(this.dataGrid.focusedRowKey).then(data => {
            //this.submisionEditPopup.ideaData = Object.assign({},data);
            //this.submisionEditPopup.show();
        })
    }

    editButtonOptions = {
        icon: "edit",
        text: this.l("Edit"),
        stylingMode: "contained",
        type: "default",
        onClick: this.editButtonClick.bind(this)
    }

    deleteButtonOptions = {
        icon: "trash",
        text: this.l("Delete"),
        stylingMode: "contained",
        type: "danger",
        onClick: this.deleteButtonClick.bind(this),
    }

    onEditCompleted(id) {
        this.onEditUnitsCompleted.emit(id);
        this.dataGrid.instance.refresh();
    }

    onFilterButtonClick(e) {
        this.getLeaveApplicationReasons();
    }

    onClearButtonClick(e) {
        this.formFilter.instance.resetValues();
    }

    // onExportButtonClick(): void{
    // }


    onToolbarPreparing(e) {
        e.toolbarOptions.visible = false;
    }

    onDelete(e) {
        swal.fire({
            title: this.l('Xóa loại đơn nghỉ phép'),
            text: this.l('Chắc chắn muốn xóa loại đơn nghỉ phép ' + e.row.data.name + '???'),
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: this.l('Yes'),
            cancelButtonText: this.l('Cancel'),
        }).then((result) => {
            if (result.value) {
                this._leaveApplicationReasonServiceProxy.delete(e.row.data.id)
                    .subscribe(result => {
                        if (result) {
                            this.dataGrid.instance.refresh();
                            this.notify.success(this.l('SuccessfullyDeleted'));
                        } else {
                            this.notify.error(this.l('FailDeleted'));
                        }
                    });
            }
        });
    }

    onEditLeaveApplicationReason(e) {
        this.leaveApplicationReasonEditPopup.leaveApplicationReasonId = e.row.data.id;
        this.leaveApplicationReasonEditPopup.readOnly = false;
        this.leaveApplicationReasonEditPopup.intFormData();
        this.leaveApplicationReasonEditPopup.show();
    }

    onViewLeaveApplicationReason(e) {
        this.leaveApplicationReasonEditPopup.leaveApplicationReasonId = e.row.data.id;
        this.leaveApplicationReasonEditPopup.readOnly = true;
        this.leaveApplicationReasonEditPopup.intFormData();
        this.leaveApplicationReasonEditPopup.show();
    }

    createLeaveApplicationReason() {
        this.leaveApplicationReasonEditPopup.readOnly = false;
        this.leaveApplicationReasonEditPopup.leaveApplicationReasonId = null;
        this.leaveApplicationReasonEditPopup.intFormData();
        this.leaveApplicationReasonEditPopup.show();
    }
}
