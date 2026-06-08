
import { Component, EventEmitter, Injector, Input, OnInit, Output, ViewChild, Type } from '@angular/core';
import { UploadFileComponent } from '@app/sangkien/shared/upload-file/upload-file.component';
import { appModuleAnimation } from '@shared/animations/routerTransition';
import { AppConsts } from '@shared/AppConsts';
import { AppComponentBase } from '@shared/common/app-component-base';
import { EOffHelper } from '@shared/helpers/EOffHelper';
import { LeaveApplicationHelper } from '@shared/helpers/LeaveApplicationHelper';
import { CommonServiceServiceProxy, LeaveApplicationReasonDto, LeaveApplicationReasonServiceProxy, LeaveApplicationTypeDto, LeaveApplicationTypeServiceProxy, MobileTokenCreateDto, MobileTokenServiceProxy } from '@shared/service-proxies/service-proxies';
import { de } from 'date-fns/locale';
import { DxFormComponent } from 'devextreme-angular';
import ArrayStore from 'devextreme/data/array_store';
import { ModalDirective } from 'ngx-bootstrap';

@Component({
  selector: 'leave-application-reason-edit-popup',
  templateUrl: './leave-application-reason-edit-popup.component.html',
  styleUrls: ['./leave-application-reason-edit-popup.component.css'],
  animations: [appModuleAnimation()]
})
export class LeaveApplicationReasonEditPopupComponent extends AppComponentBase {
  @ViewChild('categoryForm', { static: true }) categoryForm: DxFormComponent;

  @Input() leaveApplicationReasonId: number;
  @Input() leaveApplicationReasonData: LeaveApplicationReasonDto = new LeaveApplicationReasonDto();
  statusValue = "true";
  lstStatuses: any[] = [];
  dataStatuses: any;

  leaveTypeValue = "";
  lstLeaveTypes: any[] = [];
  dataLeaveTypes: any;

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
  hasApproveValue = false;

  leaveTypeCodeValue: any;

  leaveApplicationReason: LeaveApplicationReasonDto = new LeaveApplicationReasonDto();
  mobileTokenDto: MobileTokenCreateDto = new MobileTokenCreateDto();
  @Output() onEditUnitsCompleted = new EventEmitter<any>();
  key: any;
  type: any;

  popupVisible = false;
  dataLeaveTypeCodes: any;

  constructor(
    injector: Injector,
    private _leaveApplicationReasonService: LeaveApplicationReasonServiceProxy,
    private _commonService: CommonServiceServiceProxy,
    private _mobileTokenServiceProxy: MobileTokenServiceProxy,
  ) {
    super(injector);
    this.onValueChangedStatus = this.onValueChangedStatus.bind(this);
    this.onValueChangedLeaveTypes = this.onValueChangedLeaveTypes.bind(this);
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
    // this.optionPopup = option;
    this.lstStatuses = EOffHelper.createStatusStringList2();
    this.dataStatuses = new ArrayStore({
      data: this.lstStatuses,
      key: 'value',
    });




    this._commonService
      .getLookups(
        "LeaveApplicationType",
        this.appSession.tenantId,
        undefined
      )
      .subscribe((result) => {
        this.lstLeaveTypes = result;
        this.dataLeaveTypes = new ArrayStore({
          data: this.lstLeaveTypes,
          key: "value",
        });
      });

    if (this.leaveApplicationReasonId != null) {
      this.titlePopup = "Cập nhật lý do nghỉ";
      if (this.readOnly) {
        this.titlePopup = "Chi tiết lý do nghỉ";
      }
      this._leaveApplicationReasonService.getById(this.leaveApplicationReasonId).subscribe(result => {
        this.leaveApplicationReasonData = result;
        this.statusValue = result.isActive ? 'true' : 'false';// == true ? 1: 0;


      });
    } else {
      this.leaveApplicationReasonData = new LeaveApplicationReasonDto();
      this.leaveApplicationReasonData.isActive = true;
      this.leaveApplicationReasonData.nghiDungHan = false;
      this.leaveApplicationReasonData.nghiQuahan = false;
      this.titlePopup = "Khai báo lý do nghỉ";
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
    if (this.leaveApplicationReasonData.nghiDungHan == false && this.leaveApplicationReasonData.nghiQuahan == false) {
      this.notify.warn('Lý do nghỉ phải chọn: Nghỉ đúng hạn hoặc nghỉ quá hạn!!!')
      return;
    }
    if (this.leaveApplicationReasonData.nghiDungHan == true && this.leaveApplicationReasonData.nghiQuahan == true) {
      this.notify.warn('Lý do nghỉ chỉ được chọn 1: Nghỉ đúng hạn hoặc nghỉ quá hạn!!!')
      return;
    }
    if (this.leaveApplicationReasonData.nghiDungHan) {
      this.leaveApplicationReasonData.nghiQuahan = false;
    } else {
      this.leaveApplicationReasonData.nghiDungHan = false;
    }

    this.leaveApplicationReasonData.isActive = this.statusValue == 'true' ? true : false; //== 1 ? true: false;

    if (this.leaveApplicationReasonId != null) {
      this._leaveApplicationReasonService.edit(this.leaveApplicationReasonData).toPromise().then(() => {
        this.onEditUnitsCompleted.emit(this.leaveApplicationReasonData.id);
        this.notify.success('Cập nhật thành công');
        this.popupVisible = false;
        this.categoryForm.instance.resetValues();
      }).catch((error) => {
        // this.notify.error('Tạo nhóm người không thành công do ' + error.response.error.message);
        this.popupVisible = false;
      });
    } else {
      this._leaveApplicationReasonService.create(this.leaveApplicationReasonData).toPromise().then(() => {
        this.onEditUnitsCompleted.emit(this.leaveApplicationReasonData.id);
        this.notify.success('Khai báo thành công');
        this.popupVisible = false;
        this.categoryForm.instance.resetValues();
      }).catch((error) => {
        // this.notify.error('Tạo nhóm người không thành công do ' + error.response.error.message);
        this.popupVisible = false;
      });
    }
  }

  cancelEditButtonClick(e) {
    this.popupVisible = false;
    this.leaveApplicationReasonId = null;
  }

  onValueChangedApprovalRoleCodes(e) {
    this.dataLeaveTypeCodes = e.value;

  }

  onValueChangedStatus(e) {
    const previousValue = e.previousValue;
    this.statusValue = e.value;
    // Event handling commands go here
  }

  onValueChangedLeaveTypes(e) {
    const previousValue = e.previousValue;
    this.leaveTypeValue = e.value;
    // Event handling commands go here
  }

  //   onValueChangedNghiQuahan(e) {
  //     this.halfDayOffValue = e.value;
  //   }
  //   onValueChangedNghiDungHan(e) {
  //     this.hasApproveValue = e.value;
  //   }
}
