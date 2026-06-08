import { Component, EventEmitter, Injector, Input, OnInit, Output, ViewChild } from '@angular/core';
// import { UploadFileComponent } from '@app/sangkien/shared/upload-file/upload-file.component';
import { appModuleAnimation } from '@shared/animations/routerTransition';
// import { AppConsts } from '@shared/AppConsts';
import { AppComponentBase } from '@shared/common/app-component-base';
import { EOffHelper } from '@shared/helpers/EOffHelper';
import { KPIApplicationHelper } from '@shared/helpers/KPIApplicationHelper';
import { LeaveApplicationHelper } from '@shared/helpers/LeaveApplicationHelper';
import { ApprovalRoleDto, ApprovalRoleServiceProxy, CommonServiceServiceProxy, ERPComboboxItem } from '@shared/service-proxies/service-proxies';
import { log } from 'console';
import { DxFormComponent } from 'devextreme-angular';
import ArrayStore from 'devextreme/data/array_store';
import { ModalDirective } from 'ngx-bootstrap';

@Component({
  selector: 'approval-role-edit-popup',
  templateUrl: './approval-role-edit-popup.component.html',
  styleUrls: ['./approval-role-edit-popup.component.css'],
  animations: [appModuleAnimation()],
})
export class ApprovalRoleEditPopupComponent extends AppComponentBase {
  @ViewChild('categoryForm', { static: true }) categoryForm: DxFormComponent;
  // @ViewChild('uploadFileModal', { static: true }) uploadFileModal: UploadFileComponent;

  @ViewChild('createOrEditModal', { static: true }) modal: ModalDirective;

  @Input() approvalRoleId: number;
  @Input() approvalRoleData: ApprovalRoleDto = new ApprovalRoleDto();
  lstStatuses: any[] = [];
  lstRoleCodes: any[] = [];


  lstDepartment: ERPComboboxItem[] = [];
  lstUsers: ERPComboboxItem[] = [];

  dataStatuses: any;
  gridDataSource: any;
  gridBoxValue: number[] = [];
  statusValue = "";
  canApproveHalfDayLeaveValue: boolean;
  // optionPopup : string;
  titlePopup: string = "";

  active = false;
  saving = false;
  readOnly = false;
  isDisabled = false;

  approvalRole: ApprovalRoleDto = new ApprovalRoleDto();
  @Output() onEditUnitsCompleted = new EventEmitter<any>();
  key: any;
  type: any;

  popupVisible = false;

  dataCensor: any;
  dataDepartment: any;
  dataLeaveApplicationStatus: any;
  dataApprovalRoleCodes: any;
  leaveApplicationStatusValue: any;
  approvalRoleCodeValue: any;
  censorValue: any;
  departmentValue: any[] = [];
  isActiveValue = true;
  // backendURL = AppConsts.remoteServiceBaseUrl + "/";
  constructor(
    injector: Injector,
    private _approvalRoleService: ApprovalRoleServiceProxy,
    private _commonService: CommonServiceServiceProxy,
  ) {
    super(injector);
    this.onValueChangedStatus = this.onValueChangedStatus.bind(this);
    this.onValueChangedLeaveApplicationStatus = this.onValueChangedLeaveApplicationStatus.bind(this);
    // this.onValueChangedIsExecutiveBoard = this.onValueChangedIsExecutiveBoard.bind(this);
    this.onValueChangedDepartment = this.onValueChangedDepartment.bind(this);
    this.onValueChangedCensor = this.onValueChangedCensor.bind(this);
    this.onValueChangedIsActive = this.onValueChangedIsActive.bind(this);
    this.onValueChangedIsCanApproveHalfDayLeave = this.onValueChangedIsCanApproveHalfDayLeave.bind(this);
    this.onValueChangedApprovalRoleCodes = this.onValueChangedApprovalRoleCodes.bind(this);
  }

  ngOnInit() {
    const emptyItem: ERPComboboxItem = new ERPComboboxItem();
    emptyItem.value = null;
    emptyItem.displayText = '';

    this.dataLeaveApplicationStatus = LeaveApplicationHelper.getAllStatusCanBeApprove();
    this.dataApprovalRoleCodes = KPIApplicationHelper.getAllApprovalRoleCode();

    this._commonService.getLookups('Department', this.appSession.tenantId, undefined).subscribe(result => {
      this.lstDepartment = result;
      this.dataDepartment = new ArrayStore({
        data: this.lstDepartment,
        key: 'value',
      });
    });

    this._commonService.getLookups('UsersFullName', this.appSession.tenantId, undefined).subscribe(result => {
      this.lstUsers = result;
      this.dataCensor = new ArrayStore({
        data: this.lstUsers,
        key: 'value',
      });

    });
  }
  show() {
    this.popupVisible = true;
  }
  intFormData() {
    // this.optionPopup = option;
    // this.lstStatuses = [{value:true,text:'Active'},{value:false,text:'DeActive'}];
    this.lstStatuses = EOffHelper.createStatusStringList2();
    this.dataStatuses = new ArrayStore({
      data: this.lstStatuses,
      key: 'value',
    });

    this.lstRoleCodes = EOffHelper.createStatusStringList2();
    this.dataStatuses = new ArrayStore({
      data: this.lstRoleCodes,
      key: 'value',
    });


    if (this.approvalRoleId != null) {
      this.titlePopup = "Cập nhật vai trò phê duyêt";
      if (this.readOnly) {
        this.titlePopup = "Chi tiết vai trò phê duyêt";
      }
      this._approvalRoleService.getById(this.approvalRoleId).subscribe(result => {
        this.approvalRoleData = result;
        if (this.approvalRoleData.status !== null) {
          this.leaveApplicationStatusValue = this.approvalRoleData.status.split(',').map(Number);
        }

        if (this.approvalRoleData.departmentId !== null) {
          this.departmentValue = this.approvalRoleData.departmentId.split(',').map(Number);
        }

        if (this.approvalRoleData.censorId !== null) {
          this.censorValue = this.approvalRoleData.censorId.split(',').map(Number);
        }
        this.canApproveHalfDayLeaveValue = this.approvalRoleData.canApproveHalfDayLeave;
        this.approvalRoleCodeValue =  this.approvalRoleData.roleCode;
      });
    } else {
      this.titlePopup = "Thêm mới vai trò phê duyêt";

      this.approvalRoleData = new ApprovalRoleDto();
      this.approvalRoleData.isActive = true;
      this.canApproveHalfDayLeaveValue = false;
      this.categoryForm.instance.resetValues();
      if (!this.isGranted('Pages.LeaveRegistration.LeaveApplication.Owner')) {
        this.departmentValue.push(this.appSession.user.departmentId.toString());
        this.isDisabled = true;
      }
    }
  }
  saveButtonOptions = {
    icon: "save",
    text: this.l("Save"),
    stylingMode: "contained",
    type: "success",
    onClick: this.saveButtonClick.bind(this),
  }

  cancelEditButtonOptions = {
    icon: "close",
    text: this.l("Close"),
    stylingMode: "outlined",
    type: "danger",
    onClick: this.cancelEditButtonClick.bind(this)
  }

  saveButtonClick(e) {
    const isValid = this.categoryForm.instance.validate().isValid;
    if (!isValid) {
      return;
    }
    let usersList = '';
    for (const i in this.gridBoxValue) {
      usersList += this.gridBoxValue[i];
      if (this.gridBoxValue.length > 1 && parseInt(i) < this.gridBoxValue.length - 1) {
        usersList += ",";
      }
    }

    this.approvalRoleData.status = '';
    this.approvalRoleData.departmentId = '';
    this.approvalRoleData.censorId = '';
    this.approvalRole.roleCode = this.approvalRoleCodeValue;
    this.approvalRole.canApproveHalfDayLeave = this.canApproveHalfDayLeaveValue;
    // if (!this.approvalRoleData.isExecutiveBoard) {
    this.leaveApplicationStatusValue.forEach(element1 => {
      this.approvalRoleData.status += element1.toString() + ',';
    });
    this.approvalRoleData.status = this.approvalRoleData.status.substring(0, this.approvalRoleData.status.length - 1);

    this.departmentValue.forEach(element2 => {
      this.approvalRoleData.departmentId += element2.toString() + ',';
    });
    this.approvalRoleData.departmentId = this.approvalRoleData.departmentId.substring(0, this.approvalRoleData.departmentId.length - 1);

    this.censorValue.forEach(element3 => {
      this.approvalRoleData.censorId += element3.toString() + ',';
    });
    this.approvalRoleData.censorId = this.approvalRoleData.censorId.substring(0, this.approvalRoleData.censorId.length - 1);
    // }
    // this.groupData.usersList = '2';
    if (this.approvalRoleId != null) {

      this._approvalRoleService.edit(this.approvalRoleData).toPromise().then(() => {
        this.onEditUnitsCompleted.emit(this.approvalRoleData.id);
        this.notify.success('Lưu thành công');
        this.popupVisible = false;
      }).catch((error) => {
        // this.notify.error('Tạo nhóm người không thành công do ' + error.response.error.message);
        this.popupVisible = false;
      });
    } else {
      this._approvalRoleService.create(this.approvalRoleData).toPromise().then(() => {
        this.onEditUnitsCompleted.emit(this.approvalRoleData.id);
        this.notify.success('Tạo vai trò phê duyệt thành công');
        this.popupVisible = false;
      }).catch((error) => {
        // this.notify.error('Tạo nhóm người không thành công do ' + error.response.error.message);
        this.popupVisible = false;
      });
    }
  }

  cancelEditButtonClick(e) {
    this.popupVisible = false;
    this.approvalRoleId = null;
    this.approvalRoleData.role = '';
    this.approvalRoleData.roleCode = '';
    this.approvalRoleData.censorId = '';
    this.approvalRoleData.departmentId = '';
    this.approvalRoleData.status = null;
    this.approvalRoleData.isExecutiveBoard = null;
    this.approvalRoleData.isActive = null;
    this.approvalRoleData.description = '';
  }


  onValueChangedStatus(e) {
    const previousValue = e.previousValue;
    this.statusValue = e.value;
    // Event handling commands go here
  }
  onValueChangedLeaveApplicationStatus(e) {
    this.leaveApplicationStatusValue = e.value;
  }

  onValueChangedApprovalRoleCodes(e) {
    this.approvalRoleData.roleCode = e.value;

  }

  onValueChangedIsCanApproveHalfDayLeave(e) {
    this.approvalRoleData.canApproveHalfDayLeave = e.value;
  }
  onValueChangedDepartment(e) {
    this.departmentValue = e.value;
  }
  onValueChangedCensor(e) {

    this.censorValue = e.value;
  }
//   onSelectionChangedCensor(e) {
//     console.log(e);
//   }
  onValueChangedIsActive(e) {
    this.isActiveValue = e.value;
  }

}
