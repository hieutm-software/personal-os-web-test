import { HttpClient } from '@angular/common/http';
import { Component, EventEmitter, HostListener, Injector, Input, Output, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { appModuleAnimation } from '@shared/animations/routerTransition';
import { AppComponentBase } from '@shared/common/app-component-base';
import { CommonServiceServiceProxy, ERPComboboxItem, LeaveApplicationConfigDto, LeaveApplicationConfigServiceProxy, MobileTokenServiceProxy } from '@shared/service-proxies/service-proxies';
import { DxDataGridComponent, DxFormComponent } from 'devextreme-angular';
import CustomStore from 'devextreme/data/custom_store';
import { custom } from 'devextreme/ui/dialog';
import { Table } from 'primeng/components/table/table';
import { FileUpload, Paginator } from 'primeng/primeng';
import swal from 'sweetalert2/src/sweetalert2.js';
import { LeaveApplicationConfigEditPopupComponent } from './leave-application-config-edit-popup/leave-application-config-edit-popup.component';
import { EOffHelper } from '@shared/helpers/EOffHelper';
import { isNil } from 'lodash';

@Component({
    selector: 'leave-application-config',
    templateUrl: './leave-application-config.component.html',
    styleUrls: ['./leave-application-config.component.css'],
    animations: [appModuleAnimation()],
})
export class LeaveApplicationConfigComponent extends AppComponentBase {
    @ViewChild('dataGrid', { static: true }) dataGrid: DxDataGridComponent;
    @ViewChild('formFilter', { static: true }) formFilter: DxFormComponent;
    @ViewChild('dataTable', { static: true }) dataTable: Table;
    @ViewChild('paginator', { static: true }) paginator: Paginator;
    @ViewChild('ExcelFileUpload', { static: true }) excelFileUpload: FileUpload;
    @ViewChild(LeaveApplicationConfigEditPopupComponent, { static: true }) leaveApplicationConfigEditPopup: LeaveApplicationConfigEditPopupComponent;

    @Input() leaveApplicationConfigId: number;
    @Output() onEditUnitsCompleted = new EventEmitter<any>();

    lstStatuses: any[];
    lstTypes: any[];
    lstRoles: ERPComboboxItem[] = [];
    lstHalfDayOff: any[];
    lstHasApprove: any[];
    gridBoxRoleValue: number[] = [];
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

    leaveApplicationConfigData: LeaveApplicationConfigDto;

    toDay = new Date();

    constructor(
        injector: Injector,
        private _leaveApplicationConfigServiceProxy: LeaveApplicationConfigServiceProxy,
        private _activatedRoute: ActivatedRoute,
        private _commonService: CommonServiceServiceProxy,
        private _httpClient: HttpClient
    ) {
        super(injector);
        this.screenHeight = window.innerHeight;
        this.filterText = this._activatedRoute.snapshot.queryParams['filterText'] || '';
        // this.uploadUrl = AppConsts.remoteServiceBaseUrl + '/Users/ImportFromExcel';

        this.getLeaveApplicationConfigs();
        this.onEditLeaveApplicationConfig = this.onEditLeaveApplicationConfig.bind(this);
        this.onViewLeaveApplicationConfig = this.onViewLeaveApplicationConfig.bind(this);
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
        this.lstTypes = [{ value: true, text: 'Khóa phê duyệt' }, { value: false, text: 'Không khóa phê duyệt' }];
        this._commonService
            .getLookups(
                "RoleName",
                this.appSession.tenantId,
                undefined
            )
            .subscribe((result) => {
                this.lstRoles = result;
                // this.dataRoles = new ArrayStore({
                //     data: this.lstRoles,
                //     key: "value",
                // });
            });
    }

    search(event) {
        this.filterText = event;
        this.getLeaveApplicationConfigs();
    }

    isNotEmpty(value: any): boolean {
        return value !== undefined && value !== null && value !== "";
    }

    getLeaveApplicationConfigs() {
        const self = this;
        self.dataSource = {};
        self.dataSource.store = new CustomStore({
            key: "id",
            load(loadOptions: any) {
                const maxResultCount = loadOptions.take || 10;
                const skipCount = loadOptions.skip || 0;
                const sorting = "Title"; //creationTime desc

                return self._leaveApplicationConfigServiceProxy
                    .getAll(
                        self.filterText,
                        sorting,
                        maxResultCount,
                        skipCount
                    )
                    .toPromise()
                    .then((response: any) => {
                        
                        response.items.forEach((item: any, index: number) => {
                            item['STT'] = index + 1;
                            self.gridBoxRoleValue = EOffHelper.convertStringToList(
                                item.roleId
                            );
                            if (!isNil(self.lstRoles) && self.lstRoles.length > 0) {
                                item.roleId =
                                    EOffHelper.convertValuesToTexts(
                                        self.gridBoxRoleValue,
                                        self.lstRoles
                                    );
                            }
                        });
                        
                        return {
                            data: response.items,
                            totalCount: response.totalCount
                        };
                    })
                    .catch(error => {
                        
                        self.notify.error(self.l('DataLoadingFailed'));// throw 'Data Loading Error';
                    });
            },
            remove(key) {
                return self._leaveApplicationConfigServiceProxy.delete(key)
                    .toPromise()
                    .then(() => {
                        return Promise.resolve();
                    })
                    .catch(error => {
                        
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
        this.getLeaveApplicationConfigs();
    }

    allowDeleting(e) {
        return this.isGranted('Pages.LeaveRegistration.LeaveApplicationConfig.Delete');
    }

    allowUpdating(e) {
        return this.isGranted('Pages.LeaveRegistration.LeaveApplicationConfig.Edit');
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
                this._leaveApplicationConfigServiceProxy.delete(this.leaveApplicationConfigId)
                    .toPromise()
                    .then(() => {
                        this.dataGrid.instance.refresh();
                    })
                    .catch(error => {
                        
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
        this.getLeaveApplicationConfigs();
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
            title: this.l('Xóa'),
            text: this.l('Chắc chắn muốn xóa'),
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: this.l('Yes'),
            cancelButtonText: this.l('Cancel'),
        }).then((result) => {
            if (result.value) {
                this._leaveApplicationConfigServiceProxy.delete(e.row.data.id)
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

    onEditLeaveApplicationConfig(e) {
        this.leaveApplicationConfigEditPopup.leaveApplicationConfigId = e.row.data.id;
        this.leaveApplicationConfigEditPopup.readOnly = false;
        this.leaveApplicationConfigEditPopup.intFormData();
        this.leaveApplicationConfigEditPopup.show();
    }

    onViewLeaveApplicationConfig(e) {
        this.leaveApplicationConfigEditPopup.leaveApplicationConfigId = e.row.data.id;
        this.leaveApplicationConfigEditPopup.readOnly = true;
        this.leaveApplicationConfigEditPopup.intFormData();
        this.leaveApplicationConfigEditPopup.show();
    }

    createLeaveApplicationConfig() {
        this.leaveApplicationConfigEditPopup.readOnly = false;
        this.leaveApplicationConfigEditPopup.leaveApplicationConfigId = null;
        this.leaveApplicationConfigEditPopup.intFormData();
        this.leaveApplicationConfigEditPopup.show();
    }
}
