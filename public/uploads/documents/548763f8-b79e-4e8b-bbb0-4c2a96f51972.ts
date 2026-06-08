import { Component, EventEmitter, Injector, Input, OnInit, Output, ViewChild } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { appModuleAnimation } from '@shared/animations/routerTransition';
import { AppComponentBase } from '@shared/common/app-component-base';
import {
    CommonServiceServiceProxy,
    DocumentDirectionListDto,
    DocumentDirectionServiceProxy,
    DocumentDto,
    DocumentServiceProxy,
    DocumentWatcherDto,
    DocumentWatcherListDto,
    DocumentWatcherServiceProxy,
    ERPComboboxItem,
    LeaveApprovalAuthorizationDto,
    LeaveApprovalAuthorizationServiceProxy,
    TransitionHistDto,
    TransitionHistListDto,
    UpdateDocumentStatusDto,
    UploadFileDto
} from '@shared/service-proxies/service-proxies';
import ArrayStore from 'devextreme/data/array_store';
import { confirm, custom } from 'devextreme/ui/dialog';
import { AppConsts } from '@shared/AppConsts';
import { EOffHelper } from '@shared/helpers/EOffHelper';
import { UpdateDocumentDirectionComponent } from '@app/document/shared/document-directions/update-document-direction/update-document-direction.component';
import { PreviewFileComponent } from '@app/shared/common/preview-file/preview-file.component';
import { LazyLoadEvent } from '@node_modules/primeng/components/common/lazyloadevent';
import CustomStore from '@node_modules/devextreme/data/custom_store';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { isNil } from 'lodash';
import { TransferDocumentComponent } from '@app/document/document-in/tranfer-document/transfer-document.component';
import { TokenService } from 'abp-ng2-module/dist/src/auth/token.service';
import { PreviewPdfComponent } from '@app/shared/common/preview-pdf/preview-pdf.component';
import { FileUpload } from '@node_modules/primeng/primeng';
import swal from 'sweetalert2/src/sweetalert2.js';
import { DxFormComponent } from '@node_modules/devextreme-angular';
import { LeaveApplicationHelper } from '@shared/helpers/LeaveApplicationHelper';

@Component({
    selector: 'app-create-or-update-authorization',
    templateUrl: './create-or-update-authorization.component.html',
    styleUrls: ['./create-or-update-authorization.component.css'],
    animations: [appModuleAnimation()],
})
export class CreateOrUpdateLeaveApprovalAuthorizationComponent extends AppComponentBase {
    @Input() leaveApplicationAuthorizationId: number;
    @ViewChild('dcmForm', { static: true }) dcmForm: DxFormComponent;
    @ViewChild(PreviewFileComponent, { static: true }) previewFilePopup: PreviewFileComponent;
    @ViewChild(PreviewPdfComponent, { static: true }) previewFilePDF: PreviewPdfComponent;
    @ViewChild('ExcelFileUpload', { static: true }) excelFileUpload: FileUpload;
    @Output() modalSave: EventEmitter<any> = new EventEmitter<any>();

    popupRequestForDirectionVisible = false;
    popupEditVisible = false;
    popupHandleVisible = false;

    relatedDocumentsList: any[];
    gridBoxCoOperateGroupValue: number[] = [];
    gridBoxCoOperateValue: number[] = [];

    gridBoxCoOperateGroupDirecValue: number[] = [];
    gridBoxCoOperateDirecValue: number[] = [];


    gridBoxAssigneeGroupDirecValue: number[] = [];
    gridBoxAssigneeDirecValue: number[] = [];


    gridBoxWatcherGroupDirecValue: number[] = [];
    gridBoxWatcherDirecValue: number[] = [];

    txtUserGrpCoOperateSelection = '';
    dataSourceTask: any;
    detailUrl = '/app/task-management/task-detail/';
    lstUsers: ERPComboboxItem[] = [];
    lstGroups: ERPComboboxItem[] = [];
    lstDepartments: ERPComboboxItem[] = [];
    fitstDirection = null;
    checkRoleTransfer = false;
    isLoadingT = false;
    titlePopup = '';

    // lstDocumentBook: ERPComboboxItem[] = [];

    dataDocumentBook: any;
    dataDocumentType: any;
    dataSecurityLevel: any;
    dataUrgentLevel: any;

    fileListDto: UploadFileDto[] = [];

    gridBoxDepartmentPhoiHop: number[] = [];

    fileLists = '';
    filePath = "";
    errorUpload = false;
    checkIsReview = false;
    errorTextUpload = '';
    filesUpload = [];


    popupVisible = false;
    readOnly = false;
    statusValue = 1;
    dataStatuses: any;
    lstStatuses: any[] = [];
    formData: FormData;
    dataUser: any;
    uploadUrl: string;
    leaveApprovalAuthorizationData: LeaveApprovalAuthorizationDto = new LeaveApprovalAuthorizationDto();
    authorizerValue: any;
    authorizedPersonValue: any;
    hasFile = true;
    isView = false;

    constructor(
        injector: Injector,
        private location: Location,
        private _leaveApprovalAuthorizationService: LeaveApprovalAuthorizationServiceProxy,
        private _commonService: CommonServiceServiceProxy,
        private _activatedRoute: ActivatedRoute,
        private _httpClient: HttpClient,
        private _tokenService: TokenService,
        private router: Router,
    ) {
        super(injector);
        this.uploadUrl = AppConsts.remoteServiceBaseUrl + '/api/services/app/UploadFile/UploadFileLink';
        this.buttonDownload = this.buttonDownload.bind(this);
        this.onValueChangedStatus = this.onValueChangedStatus.bind(this);
        this.onValueChangedAuthorizedPerson = this.onValueChangedAuthorizedPerson.bind(this);
        this.onValueChangedAuthorizer = this.onValueChangedAuthorizer.bind(this);
    }

    ngOnInit() {
        abp.event.trigger('urlChanged');
        const emptyItem: ERPComboboxItem = new ERPComboboxItem();
        emptyItem.value = null;
        emptyItem.displayText = "";

        this._commonService.getLookups('DocumentBook', this.appSession.tenantId, undefined).subscribe(result => {
            // this.lstDocumentBook = result;
            this.dataDocumentBook = new ArrayStore({
                data: result,
                key: 'value',
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
        this._commonService.getLookups('Department', this.appSession.tenantId, undefined).subscribe(result => {
            this.lstDepartments = result;
        });
        this._commonService.getLookups('UsersFullName', this.appSession.tenantId, undefined).subscribe(result => {
            this.lstUsers = result;
        });
        this._commonService.getLookups('Groups', this.appSession.tenantId, undefined).subscribe(result => {
            this.lstGroups = result;
        });
        this.lstStatuses = EOffHelper.createStatusesList();
        this.formData = new FormData();
        this.errorUpload = false;
        this.errorTextUpload = '';
    }

    intFormData() {
        // this.optionPopup = option;
        // this.lstStatuses = EOffHelper.createStatusStringList2();
        // this.dataStatuses = new ArrayStore({
        //     data: this.lstStatuses,
        //     key: 'value',
        // });
        this.dataStatuses = LeaveApplicationHelper.getAllStatusAuthorization();

        if (this.leaveApplicationAuthorizationId != null) {
            this.titlePopup = "Cập nhật ủy quyền phê duyệt đơn nghỉ phép";
            this.isView = true;
            if (this.readOnly) {
                this.titlePopup = "Chi tiết ủy quyền phê duyệt đơn nghỉ phép";
                this.isView = false;
            }
            this._leaveApprovalAuthorizationService.getById(this.leaveApplicationAuthorizationId).subscribe(result => {
                this.leaveApprovalAuthorizationData = result;
                this.authorizedPersonValue = this.leaveApprovalAuthorizationData.authorizedPersonId;
                this.authorizerValue = this.leaveApprovalAuthorizationData.authorizerId;
                this.statusValue = this.leaveApprovalAuthorizationData.status;
                this.getFileInfos();
            });
        } else {
            this.leaveApprovalAuthorizationData = new LeaveApprovalAuthorizationDto();
            // this.leaveApplicationTypeData.isHalfDayOff = true;
            this.leaveApprovalAuthorizationData.status = 1;
            this.titlePopup = "Thêm mới ủy quyền phê duyệt đơn nghỉ phép";
            this.isView = true;
        }
    }

    show(id?: number) {
        this.popupVisible = true;
    }
    refreshPage() {
        window.location.reload();
    }
    updateStatus(status) {
        const updateDocument = new LeaveApprovalAuthorizationDto();
        updateDocument.id = this.leaveApprovalAuthorizationData.id;
        this._leaveApprovalAuthorizationService.update(updateDocument).toPromise().then(() => {
            this.notify.success('Hoàn tất thành công');
        }).catch((error) => {
        });
    }
    isNotEmpty(value: any): boolean {
        return value !== undefined && value !== null && value !== '';
    }
    getFileInfos() {
        if (this.leaveApprovalAuthorizationData.attachments != null) {
            const arrayFile = this.leaveApprovalAuthorizationData.attachments.split(',');
            if (arrayFile.length > 0) {
                for (let i = 0; i < arrayFile.length; i++) {
                    if (arrayFile[i] != '') {
                        const fileId = parseInt(arrayFile[i]);
                        this._commonService.getFileInfo(fileId).subscribe(result => {
                            this.fileListDto.push(result);
                            console.log(this.fileListDto);

                            this.hasFile = false;
                        });
                    }
                }
            }
        }
    }
    openPreview(url: any) {
        const filePath = AppConsts.remoteServiceBaseUrl + url;
        this.previewFilePopup.ngOnInit(0, filePath);
        this.previewFilePopup.show();
    }

    openDownload(filePath: any) {
        if (filePath == this.filePath && this.popupVisible) {
            this.previewFilePDF.isPdfType = false;
            this.popupVisible = false;
            this.filePath = "";
        }
        else {
            this.popupVisible = true;
            this.filePath = filePath;
            const url = AppConsts.remoteServiceBaseUrl + filePath;
            this.previewFilePDF.ngOnInit(0, url);
            this.previewFilePDF.show();
        }
    }

    buttonDownload(e) {
        const url = AppConsts.remoteServiceBaseUrl + '/File/DownloadFileFromUploadFile?id=' + e.id;
        this._httpClient.get(url, {
            responseType: 'blob',
            headers: {
                'Authorization': 'Bearer ' + this._tokenService.getToken(),
            }
        }).subscribe(response => {
            this.downLoadFile(response, '', e.fileName)
        }
        );
    }

    downLoadFile(data: any, type: string, fileName: string) {
        const blob = new Blob([data]);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.target = '_blank';
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
    }
    onClickBack() {
        this.router.navigateByUrl('/app/leave-approval-authorization');
    }

    uploadFile(data: { files: File[] }): void {
        // this.dataFiles = data;

        // this.formData = new FormData();
        let totalSize = 0;
        let errorUpload = false;
        let errorTextUpload = '';
        for (const file of data.files) {
            if (this.filesUpload.findIndex(fileUpload => fileUpload.name === file.name) > -1) {
                errorTextUpload += file.name + ': đã tồn tại file cùng tên. <br>';
                errorUpload = true;
            } else {
                if (file.size <= 50000000) {
                    this.filesUpload.push({ 'name': file.name, 'value': file });
                    totalSize += file.size;
                    this.formData.append('file', file);
                    console.log(this.filesUpload);

                    this.hasFile = false;
                }

            }

        }

        if (this.leaveApplicationAuthorizationId) {
            for (const fileDto of this.fileListDto) {
                totalSize += fileDto.fileSize;
                if (this.filesUpload.findIndex(fileUpload => fileUpload.name === fileDto.fileName) > -1) {
                    this.errorTextUpload += fileDto.fileName + ': đã tồn tại file cùng tên. <br>';
                    this.errorUpload = true;
                }
            }
        }


        if (totalSize > 50000000) {
            this.errorTextUpload += 'Tổng dung lượng file không được > 50MB .<br>';
            this.errorUpload = true;
        }

        if (errorUpload || this.errorUpload) {
            this.showErrorUpload(errorTextUpload + this.errorTextUpload);
        }
    }
    onRemoveFile(data: { file: File }): void {
        // var pos = this.fileLists.indexOf(data.files[0].name)
        // this.fileLists = this.fileLists.substring(0,pos) + this.fileLists.substring(pos+1,this.fileLists.length);
        this.errorTextUpload = '';
        this.formData = new FormData();
        let totalSize = 0;
        this.errorUpload = false;
        // this.filesUpload.delete(data.file.name);

        this.filesUpload.forEach((item, index) => {
            if (item.name == data.file.name) { this.filesUpload.splice(index, 1); }
        });

        // can't use Map ???
        //for (let key of  this.filesUpload.keys()){
        for (let i = 0; i < this.filesUpload.length; i++) {
            const fileItem = this.filesUpload[i].value;

            // if (this.filesUpload.has(fileItem.name)){
            // Check don't have 2 files with same name;
            if (this.filesUpload.filter(fileUpload => fileUpload.name === fileItem.name).length > 1) {
                this.errorTextUpload += fileItem.name + ': đã tồn tại file cùng tên. <br>';
                this.errorUpload = true;
                //break;
            } else {
                totalSize += fileItem.size;
                this.formData.append('file', fileItem);
            }
        }
        if (totalSize > 50000000) {
            this.errorTextUpload += 'Tổng dung lượng file không được > 50MB .<br>';
            this.errorUpload = true;
        }

        if (this.errorUpload) {
            this.showErrorUpload(this.errorTextUpload);
        }
    }
    showErrorUpload(errorTextUpload) {
        swal.fire({
            title: this.l('Cảnh báo'),
            html: this.l(errorTextUpload),
            icon: 'warning',
            showCancelButton: false,
            confirmButtonText: this.l('OK'),
        }).then((result) => {
            if (result.value) {
            }
        });
    }
    removeFile(fileItem: UploadFileDto) {
        // swal.fire({
        //     title: this.l('Xóa file'),
        //     text: this.l('Chắc chắn muốn xóa file ' + fileItem.fileName + '???'),
        //     icon: 'warning',
        //     showCancelButton: true,
        //     confirmButtonText: this.l('Yes'),
        //     cancelButtonText: this.l('Cancel'),
        // }).then((result) => {
        //     if (result.value) {
                
        //     }
        // });

        this.fileListDto = this.fileListDto.filter(e => e.id !== fileItem.id);
                let fileStr = '';
                for (let i = 0; i < this.fileListDto.length; i++) {
                    fileStr += this.fileListDto[i].id + ',';
                }
                this.fileLists = fileStr;
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
        onClick: this.cancelButtonClick.bind(this)
    }

    saveButtonClick(e) {
        const isValid = this.dcmForm.instance.validate().isValid;
        if (isValid) {
            if (this.leaveApplicationAuthorizationId > 0 && this.errorUpload) {
                this.showErrorUpload(this.errorTextUpload);
            } else {
                this.uploadAndSave();
            }
        }

    }

    cancelButtonClick() {
        this.dcmForm.instance.resetValues();
        this.leaveApprovalAuthorizationData = new LeaveApprovalAuthorizationDto();
        this.fileLists = '';
        this.fileListDto = [];
        // this.cdr.detectChanges();
        if (this.excelFileUpload != undefined) {
            this.excelFileUpload.clear();
        }
        // setTimeout(() => {
        //     this.isCustomPopupVisible = false;
        // }, 100);
        this.popupVisible = false;
    }

    uploadAndSave(check = null): void {
        if (this.filesUpload.length === 0 && this.fileListDto.length === 0) {
            swal.fire({
                title: this.l('Cảnh báo'),
                html: this.l('Bạn có chắc muốn thực hiện không có file đính kèm?'),
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: this.l('OK'),
            }).then((result) => {
                if (result.value) {
                    this.processUploadAndSave(check);
                } else { }
            });
        } else {
            this.processUploadAndSave(check);
        }
    }

    processUploadAndSave(check = null) {
        const headers = new HttpHeaders().append('Content-Disposition', 'multipart/form-data');
        const self = this;
        self._httpClient
            .post<any>(self.uploadUrl, self.formData, {
                headers: headers,
            })
            .subscribe(response => {
                if (response.success) {
                    if (self.fileLists.localeCompare(response.result) === 0) {
                        self.fileLists = self.fileLists;
                    } else {
                        self.fileLists += response.result;
                    }

                    self.leaveApprovalAuthorizationData.status = self.statusValue;
                    self.leaveApprovalAuthorizationData.attachments = self.fileLists;
                    self.leaveApprovalAuthorizationData.authorizerId = self.authorizerValue;
                        self.leaveApprovalAuthorizationData.authorizedPersonId = self.authorizedPersonValue;
                    if (self.leaveApprovalAuthorizationData.id != null) {
                        self._leaveApprovalAuthorizationService.update(self.leaveApprovalAuthorizationData).toPromise().then(() => {
                            self.notify.info(self.l("Sửa thành công"));
                            self.modalSave.emit(null);
                            self.cancelButtonClick();
                        }).catch((error) => {
                            self.notify.info(self.l("Sửa thất bại"));
                            self.modalSave.emit();
                            self.cancelButtonClick();
                        });
                    } else {
                        self._leaveApprovalAuthorizationService.create(self.leaveApprovalAuthorizationData).toPromise().then((result) => {
                            self.notify.info(self.l("Thêm mới thành công"));
                            self.modalSave.emit(null);
                            self.cancelButtonClick();
                        }).catch((error) => {
                            self.notify.error('Tạo ủy quyền chưa thành công, vui lòng tạo lại !');
                            self.cancelButtonClick();

                        });
                    }
                    self.fileLists = '';
                } else if (response.error != null) {
                    self.notify.error(self.l('ImportFileFailed'));
                }
            });
    }

    onValueChangedAuthorizer(e) {
        this.authorizerValue = e.value;
    }
    onValueChangedAuthorizedPerson(e) {
        this.authorizedPersonValue = e.value;
    }
    onValueChangedStatus(e) {
        this.statusValue = e.value;
    }
}
