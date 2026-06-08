
import { Component, EventEmitter, Injector, Input, OnInit, Output, ViewChild, Type } from '@angular/core';
import { UploadFileComponent } from '@app/sangkien/shared/upload-file/upload-file.component';
import { appModuleAnimation } from '@shared/animations/routerTransition';
import { AppConsts } from '@shared/AppConsts';
import { AppComponentBase } from '@shared/common/app-component-base';
import { EOffHelper } from '@shared/helpers/EOffHelper';
import { LeaveApplicationHelper } from '@shared/helpers/LeaveApplicationHelper';
import { CommonServiceServiceProxy, LeaveApplicationConfigDto, LeaveApplicationConfigServiceProxy, LeaveApplicationTypeDto, LeaveApplicationTypeServiceProxy, MobileTokenCreateDto, MobileTokenServiceProxy } from '@shared/service-proxies/service-proxies';
import { de } from 'date-fns/locale';
import { DxFormComponent } from 'devextreme-angular';
import ArrayStore from 'devextreme/data/array_store';
import { ModalDirective } from 'ngx-bootstrap';

@Component({
  selector: 'leave-application-config-edit-popup',
  templateUrl: './leave-application-config-edit-popup.component.html',
  styleUrls: ['./leave-application-config-edit-popup.component.css'],
  animations: [appModuleAnimation()]
})
export class LeaveApplicationConfigEditPopupComponent extends AppComponentBase {
  @ViewChild('categoryForm', { static: true }) categoryForm: DxFormComponent;

  @Input() leaveApplicationConfigId: number;
  @Input() leaveApplicationConfigData: LeaveApplicationConfigDto = new LeaveApplicationConfigDto();
  statusValue = "";
  lstStatuses: any[] = [];
  dataStatuses: any;

  leaveTypeValue = "";
  lstLeaveTypes: any[] = [];
  dataLeaveTypes: any;

  roleValue: string[] = [];
  roleTitle: '';
  lstRoles: any[] = [];
  dataRoles: any;

  dataHalfDayOff: any;
  lstHalfDayOff: any[] = [];
  gridDataSource: any;
  gridBoxValue: number[] = [];
  halfDayOffValue = false;
  // optionPopup : string;
  titlePopup: string = "";

  active = false;
  saving = false;
  readOnly = false;
  disabledLock = true;
  disabledWarn = true;
  hasApproveValue = false;

  leaveTypeCodeValue: any;

  leaveApplicationConfig: LeaveApplicationConfigDto = new LeaveApplicationConfigDto();
  mobileTokenDto: MobileTokenCreateDto = new MobileTokenCreateDto();
  @Output() onEditUnitsCompleted = new EventEmitter<any>();
  key: any;
  type: any;

  popupVisible = false;
  dataLeaveTypeCodes: any;

  constructor(
    injector: Injector,
    private _leaveApplicationConfigService: LeaveApplicationConfigServiceProxy,
    private _commonService: CommonServiceServiceProxy,
    private _mobileTokenServiceProxy: MobileTokenServiceProxy,
  ) {
    super(injector);
    this.onValueChangedStatus = this.onValueChangedStatus.bind(this);
    this.onValueChangedLeaveTypes = this.onValueChangedLeaveTypes.bind(this);
    this.onValueChangedRoles = this.onValueChangedRoles.bind(this);
    // this.onValueChangedNghiQuahan = this.onValueChangedNghiQuahan.bind(this);
    // this.onValueChangedNghiDungHan = this.onValueChangedNghiDungHan.bind(this);
  }

  ngOnInit() {
    this.dataLeaveTypeCodes = LeaveApplicationHelper.getAllLeaveTypeCode();
    
  }

  show() {
    this.popupVisible = true;
  }
  intFormData() {
    this._commonService
      .getLookups(
        "Roles",
        this.appSession.tenantId,
        undefined
      )
      .subscribe((result) => {
        this.lstRoles = result;
        this.dataRoles = new ArrayStore({
          data: this.lstRoles,
          key: "value",
        });
      });
    // this.optionPopup = option;
    this.lstStatuses = EOffHelper.createStatusStringList2();
    this.dataStatuses = new ArrayStore({
      data: this.lstStatuses,
      key: 'value',
    });

    this.lstLeaveTypes = [{ value: 'true', text: 'Khóa phê duyệt' }, { value: 'false', text: 'Không khóa phê duyệt' }];
    this.dataLeaveTypes = new ArrayStore({
      data: this.lstLeaveTypes,
      key: "value",
    });

    if (this.leaveApplicationConfigId != null) {
      this.titlePopup = "Cập nhật cấu hình";
      if (this.readOnly) {
        this.titlePopup = "Chi tiết cấu hình";
      }
      this._leaveApplicationConfigService.getById(this.leaveApplicationConfigId).subscribe(result => {
        this.leaveApplicationConfigData = result;
      
        
        this.statusValue = result.isActive ? 'true' : 'false';// == true ? 1: 0;
        this.leaveTypeValue = result.type ? 'true' : 'false';// == true ? 1: 0;
        this.roleValue = result.roleId.split(",");

      });
    } else {
      this.leaveApplicationConfigData = new LeaveApplicationConfigDto();
      this.leaveApplicationConfigData.isActive = true;
      this.categoryForm.instance.resetValues();
      this.titlePopup = "Khai báo cấu hình";
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

    console.log(this.statusValue);
    
    if (this.leaveTypeValue == 'true') {
      if (this.leaveApplicationConfigData.approvalLockPeriod <= this.leaveApplicationConfigData.approvalWarningPeriod ) {
        this.notify.warn('Thời gian khóa phê duyệt phải lớn hơn thời gian cảnh báo!')
        return;
      }
    }
    // if (this.leaveApplicationConfigData.nghiDungHan == true && this.leaveApplicationConfigData.nghiQuahan == true) {
    //   this.notify.warn('Lý do nghỉ chỉ được chọn 1: Nghỉ đúng hạn hoặc nghỉ quá hạn!!!')
    //   return;
    // }

    this.leaveApplicationConfigData.isActive = this.statusValue == 'true' ? true : false; //== 1 ? true: false;
    this.leaveApplicationConfigData.type = this.leaveTypeValue == 'true' ? true : false; //== 1 ? true: false;
    this.leaveApplicationConfigData.roleId = this.roleValue.join(",");
    // const roleTitle = this.lstRoles.filter(x => x.value == this.roleValue);
    // if (roleTitle == null) {
    //   this.notify.warn('Không tìm thấy nhóm quyền!')
    // }
    // this.leaveApplicationConfigData.title = roleTitle[0].displayText;

    if (this.leaveApplicationConfigId != null) {
      this._leaveApplicationConfigService.edit(this.leaveApplicationConfigData).toPromise().then(() => {
        this.onEditUnitsCompleted.emit(this.leaveApplicationConfigData.id);
        this.notify.success('Cập nhật thành công');
        this.popupVisible = false;
      }).catch((error) => {
        // this.notify.error('Tạo nhóm người không thành công do ' + error.response.error.message);
        this.popupVisible = false;
      });
    } else {
      this._leaveApplicationConfigService.create(this.leaveApplicationConfigData).toPromise().then(() => {
        this.onEditUnitsCompleted.emit(this.leaveApplicationConfigData.id);
        this.notify.success('Khai báo thành công');
        this.popupVisible = false;
      }).catch((error) => {
        // this.notify.error('Tạo nhóm người không thành công do ' + error.response.error.message);
        this.popupVisible = false;
      });
    }
  }

  cancelEditButtonClick(e) {
    this.popupVisible = false;
    this.leaveApplicationConfigId = null;
  }

  onValueChangedApprovalRoleCodes(e) {
    this.dataLeaveTypeCodes = e.value;

  }

  onValueChangedStatus(e) {
    const previousValue = e.previousValue;
    this.statusValue = e.value;
  }

  onValueChangedLeaveTypes(e) {
    const previousValue = e.previousValue;
    this.leaveTypeValue = e.value;
  
    
    if (e.value == null) {
      this.disabledLock = true;
      this.disabledWarn = true;
    } else if (e.value == 'true') {
      this.disabledLock = false;
      this.disabledWarn = true;
      this.leaveApplicationConfigData.warningPeriod = null;
    } else {
      this.disabledLock = true;
      this.disabledWarn = false;
      this.leaveApplicationConfigData.approvalLockPeriod = null;
      this.leaveApplicationConfigData.approvalWarningPeriod = null;
    }
  }

  onValueChangedRoles(e) {
  
    
    const previousValue = e.previousValue;
    this.roleValue = e.value;
  }
}
