import { Role } from './../../../shared/service-proxies/service-proxies';
import { HttpParams, HttpClient } from '@angular/common/http';
import { Component, EventEmitter, HostListener, Injector, Input, OnInit, Output, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { appModuleAnimation } from '@shared/animations/routerTransition';
import { AppConsts } from '@shared/AppConsts';
import { AppComponentBase } from '@shared/common/app-component-base';
import { ApprovalRoleDto, ApprovalRoleServiceProxy } from '@shared/service-proxies/service-proxies';
import { DxDataGridComponent, DxFormComponent } from 'devextreme-angular';
import CustomStore from 'devextreme/data/custom_store';
import { custom } from 'devextreme/ui/dialog';
import { Table } from 'primeng/components/table/table';
import { Paginator, FileUpload } from 'primeng/primeng';
import swal from 'sweetalert2/src/sweetalert2.js';
import { ApprovalRoleEditPopupComponent } from './approval-role-edit-popup/approval-role-edit-popup.component';
import { LeaveApplicationHelper } from '@shared/helpers/LeaveApplicationHelper';
import { KPIApplicationHelper } from '@shared/helpers/KPIApplicationHelper';

@Component({
  selector: 'approval-role',
  templateUrl: './approval-role.component.html',
  styleUrls: ['./approval-role.component.css'],
  animations: [appModuleAnimation()],
})
export class ApprovalRoleComponent extends AppComponentBase {
  @ViewChild('dataGrid', { static: true }) dataGrid: DxDataGridComponent;
  @ViewChild('formFilter', { static: true }) formFilter: DxFormComponent;
  @ViewChild('dataTable', { static: true }) dataTable: Table;
  @ViewChild('paginator', { static: true }) paginator: Paginator;
  @ViewChild('ExcelFileUpload', { static: true }) excelFileUpload: FileUpload;
  @ViewChild(ApprovalRoleEditPopupComponent, { static: true }) ApprovalRoleEditPopup: ApprovalRoleEditPopupComponent;

  @Input() approvalRoleId: number;
  @Output() onEditUnitsCompleted = new EventEmitter<any>();

  lstStatuses: any[];
  // uploadUrl: string;

  //Filters
  advancedFiltersAreShown = false;
  filterText = '';

  dataSource: any;

  viewAll = false;

  allowEdit = false;
  allowDelete = false;
  viewDetailPopupVisible = false;
  activeWorkId: number;

  ApprovalRoleData: ApprovalRoleDto;
  screenHeight: any;

  // filterApprovalRole = {
  //   role: "",
  //   roleCode: "",
  //   description: "",
  // }
  toDay = new Date();

  constructor(
    injector: Injector,
    private _approvalRoleServiceProxy: ApprovalRoleServiceProxy,
    private _activatedRoute: ActivatedRoute,
    private _httpClient: HttpClient
  ) {
    super(injector);
    this.screenHeight = window.innerHeight;
    this.filterText = this._activatedRoute.snapshot.queryParams['filterText'] || '';
    // this.uploadUrl = AppConsts.remoteServiceBaseUrl + '/Users/ImportFromExcel';

    this.getApprovalRoles();
    this.onEditApprovalRole = this.onEditApprovalRole.bind(this);
    this.onViewApprovalRole = this.onViewApprovalRole.bind(this);
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
  }

  search(event) {
    this.filterText = event;
    this.getApprovalRoles();
  }

  isNotEmpty(value: any): boolean {
    return value !== undefined && value !== null && value !== "";
  }

  getApprovalRoles() {
    const self = this;

    this.dataSource = {};
    this.dataSource.store = new CustomStore({
      key: "id",
      load(loadOptions: any) {
        let params: HttpParams = new HttpParams();
        params = params.set("Filter", self.isNull(self.filterText, ''));

        [
          "skip",
          "take",
          "requireGroupCount",
          "sort",
          "filter",
          "totalSummary",
          "group",
          "groupSummary"
        ].forEach(function (i) {
          if (i in loadOptions && self.isNotEmpty(loadOptions[i]))
            params = params.set(i, JSON.stringify(loadOptions[i]));
        });

        return self._httpClient.get(AppConsts.remoteServiceBaseUrl + '/api/services/app/ApprovalRole/GetAll', { params: params })
          .toPromise()
          .then((response: any) => {
            response.result.items.forEach((item) => {
                item.roleCode =
                    KPIApplicationHelper.getApprovalRoleCodesByValue(
                        item.roleCode
                    );
            });

            return {
              data: response.result.items,
              totalCount: response.result.totalCount
            };
          })
          .catch(error => {
            console.log(error);
            self.notify.error(self.l('DataLoadingFailed'));// throw 'Data Loading Error';
          });
      },
      remove(key) {
        return self._approvalRoleServiceProxy.delete(key)
          .toPromise()
          .then(() => {
            return Promise.resolve();
          })
          .catch(error => {
            console.log(error);
            self.notify.error(self.l('FailDeleted'));// throw 'Delete Error';
          })
      }
    });
  }

  getAllInPage() {
    this.paginator.rows = this.primengTableHelper.totalRecordsCount;
    //   this.getUsers();
    this.getApprovalRoles();
  }


  allowDeleting(e) {
    return this.isGranted('Pages.LeaveRegistration.ApprovalRole.Delete');
  }

  allowUpdating(e) {
    return this.isGranted('Pages.LeaveRegistration.ApprovalRole.Edit');
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
        this._approvalRoleServiceProxy.delete(this.approvalRoleId)
          .toPromise()
          .then(() => {
            this.dataGrid.instance.refresh();
            this.viewDetailPopupVisible = false;
          })
          .catch(error => {
            console.log(error);
            this.notify.error(this.l('FailDeleted'));// throw 'Delete Error';
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
  editButtonClick(e) {
    this.dataGrid.instance.byKey(this.dataGrid.focusedRowKey).then(data => {
      //this.submisionEditPopup.ideaData = Object.assign({},data);
      //this.submisionEditPopup.show();
    })
  }
  cancelButtonClick(e) {
    this.viewDetailPopupVisible = false;
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

  cancelButtonOptions = {
    icon: "close",
    text: this.l("Close"),
    stylingMode: "outlined",
    type: "danger",
    onClick: this.cancelButtonClick.bind(this)
  }

  onEditCompleted(id) {
    this.onEditUnitsCompleted.emit(id);
    this.viewDetailPopupVisible = false;
    this.dataGrid.instance.refresh();
  }

  onFilterButtonClick(e) {
    this.getApprovalRoles();
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
      title: this.l('Xóa vai trò phê duyệt'),
      text: this.l('Chắc chắn muốn xóa vai trò phê duyệt ' + e.row.data.censorName + '???'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: this.l('Yes'),
      cancelButtonText: this.l('Cancel'),
    }).then((result) => {
      if (result.value) {
        this._approvalRoleServiceProxy.delete(e.row.data.id)
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


  onEditApprovalRole(e) {
    this.ApprovalRoleEditPopup.approvalRoleId = e.row.data.id;
    this.ApprovalRoleEditPopup.readOnly = false;
    this.ApprovalRoleEditPopup.intFormData();
    this.ApprovalRoleEditPopup.show();
  }

  onViewApprovalRole(e) {
    this.ApprovalRoleEditPopup.approvalRoleId = e.row.data.id;
    this.ApprovalRoleEditPopup.readOnly = true;
    this.ApprovalRoleEditPopup.intFormData();
    this.ApprovalRoleEditPopup.show();
  }

  createApprovalRole() {
    this.ApprovalRoleEditPopup.readOnly = false;
    this.ApprovalRoleEditPopup.approvalRoleId = null;
    this.ApprovalRoleEditPopup.intFormData();
    this.ApprovalRoleEditPopup.show();

  }

}
