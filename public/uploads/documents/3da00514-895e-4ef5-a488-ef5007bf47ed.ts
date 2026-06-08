import { Component, EventEmitter, Injector, Input, OnInit, Output, ViewChild } from '@angular/core';
import { UploadFileComponent } from '@app/sangkien/shared/upload-file/upload-file.component';
import { appModuleAnimation } from '@shared/animations/routerTransition';
import { AppConsts } from '@shared/AppConsts';
import { AppComponentBase } from '@shared/common/app-component-base';
import { EOffHelper } from '@shared/helpers/EOffHelper';
import { LeaveApplicationHelper } from '@shared/helpers/LeaveApplicationHelper';
import { LeaveApplicationTypeDto, LeaveApplicationTypeServiceProxy } from '@shared/service-proxies/service-proxies';
import { de } from 'date-fns/locale';
import { DxFormComponent } from 'devextreme-angular';
import ArrayStore from 'devextreme/data/array_store';
import { ModalDirective } from 'ngx-bootstrap';

@Component({
  selector: 'leave-application-type-edit-popup',
  templateUrl: './leave-application-type-edit-popup.component.html',
  styleUrls: ['./leave-application-type-edit-popup.component.css'],
  animations: [appModuleAnimation()]
})
export class LeaveApplicationTypeEditPopupComponent extends AppComponentBase {
  @ViewChild('categoryForm', { static: true }) categoryForm: DxFormComponent;

  @Input() leaveApplicationTypeId: number;
  @Input() leaveApplicationTypeData: LeaveApplicationTypeDto = new LeaveApplicationTypeDto();
  statusValue = "";
  dataStatuses: any;
  lstStatuses: any[] = [];

  typesValue = "";
  dataTypes: any;
  lstTypes: any[] = [];

  lstHalfDayOff: any[] = [];
  dataHalfDayOff: any;
  gridDataSource: any;
  gridBoxValue: number[] = [];
  halfDayOffValue = false;
  // optionPopup : string;
  titlePopup: string = "";

  active = false;
  saving = false;
  readOnly = false;
  hasApproveValue = false;

  leaveTypeCodeValue: any;

  leaveApplicationType: LeaveApplicationTypeDto = new LeaveApplicationTypeDto();
  @Output() onEditUnitsCompleted = new EventEmitter<any>();
  key: any;
  type: any;

  popupVisible = false;
  dataLeaveTypeCodes: any;

  constructor(
    injector: Injector,
    private _leaveApplicationTypeService: LeaveApplicationTypeServiceProxy,
  ) {
    super(injector);
    this.onValueChangedStatus = this.onValueChangedStatus.bind(this);
    this.onValueChangedHalfDayOff = this.onValueChangedHalfDayOff.bind(this);
    this.onValueChangedHasApprove = this.onValueChangedHasApprove.bind(this);
  }

  ngOnInit() {
    this.dataLeaveTypeCodes = LeaveApplicationHelper.getAllLeaveTypeCode();
  }

  show() {
    this.popupVisible = true;
  }
  intFormData() {
    // this.optionPopup = option;
    this.lstStatuses = EOffHelper.createStatusStringList2();
    this.dataStatuses = new ArrayStore({
      data: this.lstStatuses,
      key: 'value',
    });

    this.lstTypes = EOffHelper.createTypeStringList();
    this.dataStatuses = new ArrayStore({
      data: this.lstStatuses,
      key: 'value',
    });

    if (this.leaveApplicationTypeId != null) {
      this.titlePopup = "Cập nhật loại đơn xin nghỉ";
      if (this.readOnly) {
        this.titlePopup = "Chi tiết loại đơn xin nghỉ";
      }
      this._leaveApplicationTypeService.getById(this.leaveApplicationTypeId).subscribe(result => {
        this.leaveApplicationTypeData = result;
        this.statusValue = result.isActive ? 'true' : 'false';// == true ? 1: 0;
        this.halfDayOffValue = result.isHalfDayOff;
        this.hasApproveValue = result.hasApprove;
      });
    } else {
      this.leaveApplicationTypeData = new LeaveApplicationTypeDto();
      // this.leaveApplicationTypeData.isHalfDayOff = true;
      this.leaveApplicationTypeData.hasApprove = true;
      this.leaveApplicationTypeData.isActive = true;
      this.categoryForm.instance.resetValues();
      this.titlePopup = "Thêm mới loại đơn xin nghỉ";
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

    this.leaveApplicationTypeData.isActive = this.statusValue == 'true' ? true : false; //== 1 ? true: false;
    this.leaveApplicationTypeData.isHalfDayOff = this.halfDayOffValue;
    this.leaveApplicationTypeData.hasApprove = this.hasApproveValue;
    this.leaveApplicationTypeData.type = this.dataLeaveTypeCodes;
    // this.groupData.usersList = '2';
    if (this.leaveApplicationTypeId != null) {
      this._leaveApplicationTypeService.edit(this.leaveApplicationTypeData).toPromise().then(() => {
        this.onEditUnitsCompleted.emit(this.leaveApplicationTypeData.id);
        this.notify.success('Cập nhật thành công');
        this.popupVisible = false;
      }).catch((error) => {
        // this.notify.error('Tạo nhóm người không thành công do ' + error.response.error.message);
        this.popupVisible = false;
      });
    } else {
      this._leaveApplicationTypeService.create(this.leaveApplicationTypeData).toPromise().then(() => {
        this.onEditUnitsCompleted.emit(this.leaveApplicationTypeData.id);
        this.notify.success('Tạo Loại đơn nghỉ phép thành công');
        this.popupVisible = false;
      }).catch((error) => {
        // this.notify.error('Tạo nhóm người không thành công do ' + error.response.error.message);
        this.popupVisible = false;
      });
    }
  }

  cancelEditButtonClick(e) {
    this.popupVisible = false;
    this.leaveApplicationTypeId = null;
  }

  onValueChangedApprovalRoleCodes(e) {
    this.dataLeaveTypeCodes = e.value;

  }

  onValueChangedStatus(e) {
    const previousValue = e.previousValue;
    this.statusValue = e.value;
    // Event handling commands go here
  }
  onValueChangedHalfDayOff(e) {
    this.halfDayOffValue = e.value;
  }
  onValueChangedHasApprove(e) {
    this.hasApproveValue = e.value;
  }
}
