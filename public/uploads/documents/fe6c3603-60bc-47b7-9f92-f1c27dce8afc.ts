import { Location } from "@angular/common";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import {
    Component,
    EventEmitter,
    Injector,
    Input,
    OnInit,
    Output,
    ViewChild,
} from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
// import { RequestDirectionComponent } from '@app/leaveApplication/leaveApplication-in/request-direction/request-direction.component';
import { UploadFileComponent } from "@app/sangkien/shared/upload-file/upload-file.component";
import { PreviewFileComponent } from "@app/shared/common/preview-file/preview-file.component";
import { UserGroupComponent } from "@app/shared/common/user-group/user-group.component";
import { ChatSignalrService } from "@app/shared/layout/chat/chat-signalr.service";
import { NotifySignalrService } from "@app/shared/layout/notifications/notify-signalr.service";
import { CustomSortedArrayStore } from "@devexpress/analytics-core/analytics-internal";
import { appModuleAnimation } from "@shared/animations/routerTransition";
import { AppConsts } from "@shared/AppConsts";
import { AppComponentBase } from "@shared/common/app-component-base";
import { EOffHelper } from "@shared/helpers/EOffHelper";
import {
    LeaveApplicationHelper,
    LeaveApplicationStatusValue,
} from "@shared/helpers/LeaveApplicationHelper";
import {
    CommonServiceServiceProxy,
    EmployeeAnnualLeaveDto,
    EmployeeAnnualLeaveServiceProxy,
    EmployeeInfoDto,
    UpdateStatusLeaveApplicationDto,
    LeaveApplicationLogDto,
    EmployeeInfoServiceProxy,
    ERPComboboxItem,
    LeaveApplicationDto,
    LeaveApplicationServiceProxy,
    LeaveApplicationTypeDto,
    LeaveApplicationTypeServiceProxy,
    UploadFileDto,
    LeaveApplicationReasonDto,
    LeaveApplicationReasonServiceProxy,
} from "@shared/service-proxies/service-proxies";
import { DxFormComponent } from "devextreme-angular";
import ArrayStore from "devextreme/data/array_store";
import CustomStore from "devextreme/data/custom_store";
import notify from "devextreme/ui/notify";
import { isNil } from "lodash";
import moment, { now } from "moment";
import { ModalDirective } from "ngx-bootstrap";
import { FileUpload } from "primeng/primeng";
import swal from "sweetalert2/src/sweetalert2.js";

@Component({
    selector: "create-or-update-application",
    templateUrl: "./create-or-update-application.component.html",
    styleUrls: ["./create-or-update-application.component.css"],
    animations: [appModuleAnimation()],
})
export class CreateOrUpdateApplicationComponent extends AppComponentBase {
    @ViewChild("leaveApplicationForm", { static: true })
    leaveApplicationForm: DxFormComponent;
    @ViewChild("uploadFileModal", { static: true })
    uploadFileModal: UploadFileComponent;
    @ViewChild("createOrEditModal", { static: true }) modal: ModalDirective;
    @ViewChild("ExcelFileUpload", { static: true }) excelFileUpload: FileUpload;
    @ViewChild(UserGroupComponent, { static: true })
    userGroupOwnerPopup: UserGroupComponent;

    // @ViewChild(RequestDirectionComponent, { static: true }) requestForDirectionPopup: RequestDirectionComponent;
    // @ViewChild(HandleleaveApplicationInComponent, { static: true }) handleleaveApplicationPopup: HandleleaveApplicationInComponent;
    @ViewChild(PreviewFileComponent, { static: true })
    updateLeaveApplicationStatusData: UpdateStatusLeaveApplicationDto =
        new UpdateStatusLeaveApplicationDto();
    previewFilePopup: PreviewFileComponent;

    dataSource: any = [];
    title: string;
    leaveApplicationId: number;
    UserGroups = 'UserGroups'

    @Input() leaveApplicationData: LeaveApplicationDto =
        new LeaveApplicationDto();
    @Output() onEditleaveApplicationCompleted = new EventEmitter<any>();
    lstStatuses: any[] = [];
    lstLeaveType: ERPComboboxItem[] = [];
    lstleaveApplication: ERPComboboxItem[] = [];
    lstTenants: ERPComboboxItem[] = [];
    lstApplicationType: ERPComboboxItem[] = [];
    // lstApplicationTypeHalfDay: ERPComboboxItem[] = [];
    lstDepartment: ERPComboboxItem[] = [];
    lstApproval: ERPComboboxItem[] = [];
    lstUsers: ERPComboboxItem[] = [];
    lstUsersSign: ERPComboboxItem[] = [];
    lstGroups: ERPComboboxItem[] = [];
    employeeInfoData: EmployeeInfoDto = new EmployeeInfoDto();
    employeeAnnualLeaveData: EmployeeAnnualLeaveDto = new EmployeeAnnualLeaveDto();
    leaveApplicationTypeDataCur: LeaveApplicationTypeDto = new LeaveApplicationTypeDto();
    leaveApplicationTypeDataPre: LeaveApplicationTypeDto = new LeaveApplicationTypeDto();
    LeaveApplicationReasonData: LeaveApplicationReasonDto = new LeaveApplicationReasonDto();


    dataStatuses: any;
    // dataDirectionStatuses: any;
    dataleaveApplication: any;
    dataApplicationType: any;
    // dataApplicationTypeHalfDay: any;
    dataSecurityLevel: any;
    dataUrgentLevel: any;
    dataTenants: any;
    dataDepartment: any;
    dataAuthorized: any;
    dataCensor: any;

    gridDataUsersSource: any;

    // statusValue : boolean;
    unitValue: number;
    leaveApplicationValue: number;
    applicationTypeCurValue: number;
    applicationTypePreValue: number;
    securityLevelValue: number;
    urgentLevelValue: number;
    authorizedValue: number;
    censorValue: number;
    approvalValue: number;
    applicationTypeText: string;

    leaveTypeValue: number;

    reasonContent: string;

    hasDirectionValue: boolean = false;
    needDirection: boolean = false;
    // optionPopup : string;

    active = false;
    saving = false;
    readOnly = false;
    hasNumDaysOff = false;
    hasLeaveType = false;
    cantPickCensor = true;

    key: any;
    type: any;

    popupVisible = false;
    reasonEditVisible = false;
    backendURL = AppConsts.remoteServiceBaseUrl + "/";

    uploadUrl: string;
    value: any[] = [];
    myFile: any;
    fileLists = "";
    uploadedFiles: any[] = [];
    fileListDto: UploadFileDto[] = [];
    formData: FormData;

    errorUpload = false;
    errorTextUpload = "";
    filesUpload = [];

    employeeName: any;
    fromDateValue: any;
    toDateValue: any;
    weekendCounter: number;
    numberOfDayOffValue: number;
    numberOfDayOffTemp: number;
    isLeaveWeekendValue: boolean = false
    isLeaveSendMailValue: boolean = false
    annualLeaveLastYearTemp: number;

    currentDate = moment;
    currentYear: number;
    lastYear: number;
    // related people
    txtUserGrpRelatedPeopleSelection = "";
    gridDataRelatedPeopleSource: any;
    gridBoxRelatedPeopleValue: number[] = [];
    gridDataRelatedPeopleGroupSource: any;
    gridBoxRelatedPeopleGroupValue: number[] = [];

    lstKyHieu: ERPComboboxItem[] = [];
    kyHieuData: any;
    lstApplicationReason: LeaveApplicationReasonDto[] = [];
    dataApplicationReason: any;
    reasonValue: number;
    isDataLoaded = false;
    haveReason = true;
    leaveTypevalueChange = true;
    typeApproval = 0;

    constructor(
        injector: Injector,
        private router: Router,
        private _leaveApplicationService: LeaveApplicationServiceProxy,
        private _employeeInfoService: EmployeeInfoServiceProxy,
        // private _leaveApplicationTypeService: LeaveApplicationTypeServiceProxy,
        private _activatedRoute: ActivatedRoute,
        private _commonService: CommonServiceServiceProxy,
        private _employeeAnnualLeaveService: EmployeeAnnualLeaveServiceProxy,
        private _leaveApplicationTypeService: LeaveApplicationTypeServiceProxy,
        private _leaveApplicationReasonServiceProxy: LeaveApplicationReasonServiceProxy,
        private _httpClient: HttpClient,
        private location: Location,
        private _NotifySignalrService: ChatSignalrService
    ) {
        super(injector);
        this.uploadUrl =
            AppConsts.remoteServiceBaseUrl +
            "/api/services/app/UploadFile/UploadFileLink";
        // this.uploadChunk = this.uploadChunk.bind(this);
        this.toDateValueChanged = this.toDateValueChanged.bind(this);
        this.fromDateValueChanged = this.fromDateValueChanged.bind(this);
        this.onValueChangedLeaveApplicationType = this.onValueChangedLeaveApplicationType.bind(this);
        this.onValueChangedCensor = this.onValueChangedCensor.bind(this);
        this.onValueChangedAuthorized = this.onValueChangedAuthorized.bind(this);
        this.onValueChangedDepartment = this.onValueChangedDepartment.bind(this);
        this.onValueChangedWeekend = this.onValueChangedWeekend.bind(this);
        this.numberOfDayValueChanged = this.numberOfDayValueChanged.bind(this);

        this.onValueChangedLeaveApplicationReason = this.onValueChangedLeaveApplicationReason.bind(this);
        // this.onChanged = this.onChanged.bind(this);
        // this.onValueChangedHalfDayOff = this.onValueChangedHalfDayOff.bind(this);

        const Id = this._activatedRoute.snapshot.paramMap.get("id");
        this.leaveApplicationId = parseInt(Id == null ? "0" : Id);
    }

    ngOnInit() {
        this.currentDate = moment;
        this.currentYear = moment().year();
        this.lastYear = moment().year() - 1;
        // this.dataStatuses = LeaveApplicationHelper.
        this.employeeName = "Sample data";
        this.initFormData();
        this.show(this.leaveApplicationId);
        this.calculateDaysOff = this.calculateDaysOff.bind(this);

    }
    initFormData() {
        // this.dataStatuses =
        //     LeaveApplicationHelper.getAllLeaveApplicationStatusesList();

        // this.leaveApplicationData.fromDate = moment();

        this._commonService
            .getLookups(
                "LeaveApplicationType",
                this.appSession.tenantId,
                undefined
            )
            .subscribe((result) => {
                this.lstApplicationType = result;
                this.dataApplicationType = new ArrayStore({
                    data: this.lstApplicationType,
                    key: "value",
                });
            });




        this._commonService
            .getLookups("Department", this.appSession.tenantId, undefined)
            .subscribe((result) => {
                this.lstDepartment = result;
                this.dataDepartment = new ArrayStore({
                    data: this.lstDepartment,
                    key: "value",
                });
            });

        this._commonService
            .getLookups("Groups", this.appSession.tenantId, undefined)
            .subscribe((result) => {
                this.lstGroups = result;
                this.gridDataRelatedPeopleGroupSource = new CustomStore({
                    loadMode: "raw",
                    key: "value",
                    load() {
                        return result;
                    },
                });
            });

        this._commonService
            .getLookups("UsersFullName", this.appSession.tenantId, undefined)
            .subscribe((result) => {
                this.lstUsers = result;
                this.gridDataUsersSource = new CustomStore({
                    loadMode: "raw",
                    key: "value",
                    load() {
                        return result;
                    },
                });
                this.dataAuthorized = this.gridDataUsersSource;
                this.gridDataRelatedPeopleSource = this.gridDataUsersSource;
            });
        this._commonService.getLookups('KyHieuChamCong', this.appSession.tenantId, undefined).subscribe(result => {
            this.lstKyHieu = result;
            this.kyHieuData = new ArrayStore({
                data: this.lstKyHieu,
                key: 'value'
            })
            this.isDataLoaded = true;
        });
    }

    toDateValueChanged(e) {
        this.leaveApplicationData.toDate = e.value;

        if (isNil(this.leaveApplicationData.fromDate)) {
            this.leaveApplicationData.fromDate = e.value;
        }
        return this.calculateDaysOff();
    }

    fromDateValueChanged(e) {
        this.leaveApplicationData.fromDate = e.value;

        if (isNil(this.leaveApplicationData.toDate)) {
            this.leaveApplicationData.toDate = e.value;
        }
        return this.calculateDaysOff();
    }

    calculateDaysOff() {
        const originalDataLeaveType = [...this.lstApplicationType];
        const temData = originalDataLeaveType.filter(item => item.value === this.applicationTypeCurValue);
        this.leaveTypeValue = temData[0].refValue;

        if (this.leaveTypeValue === 1) {
            this.numberOfDayOffValue = 0.5;
            this.fromDateValue = moment(
                this.leaveApplicationData.fromDate,
                "DD-MM-YYYY"
            );
            this.toDateValue = moment(
                this.leaveApplicationData.toDate,
                "DD-MM-YYYY"
            );
            if (this.leaveApplicationData.fromDate && this.leaveApplicationData.toDate) {
                if (this.fromDateValue.diff(this.toDateValue)) {
                    this.notify.warn(
                        "Loại nghỉ phép này chỉ áp dụng cho nghỉ 1 ngày"
                    );
                    return;
                }
            }
        } else {
            this.fromDateValue = moment(
                this.leaveApplicationData.fromDate,
                "DD-MM-YYYY"
            );
            this.toDateValue = moment(
                this.leaveApplicationData.toDate,
                "DD-MM-YYYY"
            );
            this.weekendCounter = 0;
            const diffDate = this.toDateValue.diff(this.fromDateValue, "days") + 1;
            while (this.fromDateValue.isSameOrBefore(this.toDateValue)) {
                if (
                    this.fromDateValue.format("ddd") == "Sat" ||
                    this.fromDateValue.format("ddd") == "Sun"
                ) {
                    this.weekendCounter++;
                }
                this.fromDateValue.add("days", 1);
            }
            if (this.isLeaveWeekendValue) {
                this.numberOfDayOffValue = diffDate
            } else {
                this.numberOfDayOffValue = diffDate - this.weekendCounter;
            }

            if (isNaN(this.numberOfDayOffValue)) {
                this.numberOfDayOffValue = 0
            }
        }



        // NOTE

        this._commonService.getApprovalPeopleNew(this.typeApproval, this.leaveApplicationData.status, 0).subscribe(result => {
            this.dataCensor = new CustomStore({
                loadMode: "raw",
                key: "value",
                load() {
                    return result;
                }
            })
        })

        // if (
        //     (this.isGranted('Pages.LeaveRegistration.Approvel.LDP'))
        //     ||
        //     (this.isGranted('Pages.LeaveRegistration.Approvel.TN'))
        //     ||
        //     (this.isGranted('Pages.LeaveRegistration.Approvel.LDPTCHC'))
        //     ||
        //     (this.isGranted('Pages.LeaveRegistration.Approvel.PGD'))
        //     ||
        //     (this.isGranted('Pages.LeaveRegistration.Approvel.TGD'))
        // ) {
        //     this.cantPickCensor = false
        // } else {

        //     this.censorValue = null;
        //     if (this.numberOfDayOffValue > 0) {
        //         // this.hasNumDaysOff = false;
        //         if (Array.isArray(this.lstUsersSign)) {
        //             if (Array.isArray(this.lstApplicationType)) {
        //                 if (this.numberOfDayOffValue > 0) {
        //                     this.hasNumDaysOff = true;
        //                     const originalDataType = [...this.lstApplicationType];
        //                     let temDataType = originalDataType.filter(item => item.value === this.applicationTypeCurValue);


        //                     // Tạo một bản sao của mảng dataCencor để lưu các dữ liệu ban đầu
        //                     const originalDataCencor = [...this.lstUsersSign];
        //                     if (temDataType.length > 0) {
        //                         if (temDataType[0].displayCode === 'KL') {
        //                             if (this.numberOfDayOffValue < 5) {
        //                                 const temData = originalDataCencor.filter(item => item.displayCode === '1');
        //                                 if (temData.length <= 0) {
        //                                     this.dataCensor = new CustomStore({
        //                                         loadMode: "raw",
        //                                         key: "value",
        //                                         load() {
        //                                             return originalDataCencor;
        //                                         },
        //                                     });
        //                                 } else {
        //                                     this.dataCensor = new CustomStore({
        //                                         loadMode: "raw",
        //                                         key: "value",
        //                                         load() {
        //                                             return temData;
        //                                         },
        //                                     });
        //                                 }
        //                             } else if (this.numberOfDayOffValue >= 5) {
        //                                 const temData = originalDataCencor.filter(item => item.displayCode === '2');
        //                                 this.dataCensor = new CustomStore({
        //                                     loadMode: "raw",
        //                                     key: "value",
        //                                     load() {
        //                                         return temData;
        //                                     },
        //                                 });
        //                             }
        //                         } else {
        //                             if (this.numberOfDayOffValue < 14) {
        //                                 const temData = originalDataCencor.filter(item => item.displayCode === '1');

        //                                 if (temData.length <= 0) {
        //                                     this.dataCensor = new CustomStore({
        //                                         loadMode: "raw",
        //                                         key: "value",
        //                                         load() {
        //                                             return originalDataCencor;
        //                                         },
        //                                     });
        //                                 } else {
        //                                     this.dataCensor = new CustomStore({
        //                                         loadMode: "raw",
        //                                         key: "value",
        //                                         load() {
        //                                             return temData;
        //                                         },
        //                                     });
        //                                 }
        //                             } else if (this.numberOfDayOffValue >= 14 && (this.isGranted('Pages.LeaveRegistration.Approvel.NLD'))) {
        //                                 const temData = originalDataCencor.filter(item => item.displayCode === '2');
        //                                 this.dataCensor = new CustomStore({
        //                                     loadMode: "raw",
        //                                     key: "value",
        //                                     load() {
        //                                         return temData;
        //                                     },
        //                                 });
        //                             }
        //                         }
        //                     } else {
        //                         this.hasNumDaysOff = false;
        //                     }
        //                 } else {
        //                     this.hasNumDaysOff = false;
        //                 }
        //             }


        //         }
        //         this.onChanged();
        //     } else {
        //         this.hasNumDaysOff = false;
        //         this.onChanged();
        //     }
        // }



        return this.numberOfDayOffValue;
    }

    // onChanged() {

    //     if (
    //         (
    //             (this.isGranted('Pages.LeaveRegistration.Approvel.LDP'))
    //             &&
    //             !(this.isGranted('Pages.LeaveRegistration.Approvel.LDPTCHC'))
    //         )
    //         ||
    //         (this.isGranted('Pages.LeaveRegistration.Approvel.TN'))
    //         ||
    //         (this.isGranted('Pages.LeaveRegistration.Approvel.TGD'))
    //     ) {
    //         this.cantPickCensor = false
    //     } else if (
    //         (this.isGranted('Pages.LeaveRegistration.Approvel.PGD'))
    //     ) {
    //         this.cantPickCensor = false
    //         const originalDataCencor = [...this.lstUsersSign];
    //         const temData = originalDataCencor.filter(item => item.displayCode === '3');
    //         this.dataCensor = new CustomStore({
    //             loadMode: "raw",
    //             key: "value",
    //             load() {
    //                 return temData;
    //             },
    //         });

    //         this.censorValue = temData[0].value;
    //     } else if (
    //         (this.isGranted('Pages.LeaveRegistration.Approvel.LDPTCHC'))
    //     ) {
    //         this.cantPickCensor = false
    //         const originalDataCencor = [...this.lstUsersSign];
    //         const temData = originalDataCencor.filter(item => item.displayCode === '4');
    //         this.dataCensor = new CustomStore({
    //             loadMode: "raw",
    //             key: "value",
    //             load() {
    //                 return temData;
    //             },
    //         });
    //         this.censorValue = temData[0].value;
    //     } else {
    //         console.log('hasNumDaysOff', this.hasNumDaysOff);
    //         console.log('hasLeaveType', this.hasLeaveType);
    //         if (this.hasNumDaysOff === true && this.hasLeaveType === true) {
    //             this.cantPickCensor = false
    //         } else {
    //             this.cantPickCensor = true
    //         }
    //     }
    // }

    show(id?: number) {
        this.readOnly = false;

        if (id) {
            this.saveButtonOptions.text = this.l("Update");
            this.title = "Cập nhật đơn nghỉ phép";
            this.leaveApplicationId = id;
            this.reasonEditVisible = true;

            Promise.all([
                this._commonService
                    .getLookups(
                        "UsersFullName",
                        this.appSession.tenantId,
                        undefined
                    )
                    .toPromise(),
                this._commonService
                    .getLookups("Groups", this.appSession.tenantId, undefined)
                    .toPromise(),
                this._leaveApplicationService.getById(id).toPromise(),
            ]).then((result) => {
                this.lstUsers = result[0];
                this.lstGroups = result[1];

                this.gridDataUsersSource = new CustomStore({
                    loadMode: "raw",
                    key: "value",
                    load() {
                        return result[0];
                    },
                });

                this.dataAuthorized = this.gridDataUsersSource;
                this.gridDataRelatedPeopleSource = this.gridDataUsersSource;

                this.gridDataRelatedPeopleGroupSource = new CustomStore({
                    loadMode: "raw",
                    key: "value",
                    load() {
                        return result[1];
                    },
                });
                this.leaveApplicationData = result[2];
                this.leaveApplicationData.sendMail = true;
                this.isLeaveSendMailValue = true;
                // this._commonService
                //     .getApprovalPeople(
                //         this.appSession.tenantId,
                //         this.leaveApplicationData.departmentId,
                //         this.leaveApplicationData.status,
                //         false
                //     )
                //     .subscribe((result) => {
                //         this.lstUsersSign = result;
                //         this.dataCensor = new CustomStore({
                //             loadMode: "raw",
                //             key: "value",
                //             load() {
                //                 return result;
                //             },
                //         });
                //         //this.onChanged();
                //     });
                this.numberOfDayOffTemp =
                    this.leaveApplicationData.numberOfDayOff; // Luu so ngay nghi da dang ky truoc khi chinh sua
                this.applicationTypeCurValue =
                    this.leaveApplicationData.applicationTypeId;
                this.censorValue = this.leaveApplicationData.censorId;
                this.authorizedValue =
                    this.leaveApplicationData.authorizedPersonId;

                this.gridBoxRelatedPeopleValue = EOffHelper.convertStringToList(
                    this.leaveApplicationData.relatedPeopleList
                );
                this.gridBoxRelatedPeopleGroupValue =
                    EOffHelper.convertStringToList(
                        this.leaveApplicationData.relatedGroupList
                    );

                if (!isNil(this.lstUsers) && this.lstUsers.length > 0) {
                    this.txtUserGrpRelatedPeopleSelection =
                        EOffHelper.convertValuesToTexts(
                            this.gridBoxRelatedPeopleValue,
                            this.lstUsers
                        );
                }
                if (!isNil(this.lstGroups) && this.lstGroups.length > 0) {
                    this.txtUserGrpRelatedPeopleSelection +=
                        "," +
                        EOffHelper.convertValuesToTexts(
                            this.gridBoxRelatedPeopleGroupValue,
                            this.lstGroups
                        );
                }
                if (this.leaveApplicationData.leaveApplicationReasonId != null && this.leaveApplicationData.leaveApplicationReasonId > 0) {
                    this.haveReason = false;
                    this.reasonValue = this.leaveApplicationData.leaveApplicationReasonId
                } else {
                    this.haveReason = true;
                }
                // Get EmployeeInfoHrm
                this._employeeInfoService
                    .getBySubscriberEmail(
                        this.leaveApplicationData.subcriberEmail
                    )
                    .subscribe((result) => {
                        this.employeeInfoData = result;


                        // Get employeeAnnualLeave
                        this._employeeAnnualLeaveService
                            .getAnuualByEmployeeId(this.appSession.user.id ,this.employeeInfoData.employeeId)
                            .subscribe((result) => {
                                this.employeeAnnualLeaveData = result;
                                // if (moment().month() > 2) {
                                //     if (
                                //         this.employeeAnnualLeaveData.daysUsed >
                                //         this.employeeAnnualLeaveData
                                //             .annualLeaveLastYear &&
                                //         this.employeeAnnualLeaveData
                                //             .annualLeaveThisYearUsed == 0
                                //     ) {
                                //         this.employeeAnnualLeaveData.annualLeaveThisYearUsed =
                                //             this.employeeAnnualLeaveData
                                //                 .daysUsed -
                                //             this.employeeAnnualLeaveData
                                //                 .annualLeaveLastYear;
                                //     }
                                //     this.employeeAnnualLeaveData.daysLeft =
                                //         this.employeeAnnualLeaveData
                                //             .numberOfAnnualLeave -
                                //         this.employeeAnnualLeaveData
                                //             .annualLeaveThisYearUsed;

                                //     if (
                                //         this.employeeAnnualLeaveData.daysLeft <
                                //         0
                                //     ) {
                                //         this.employeeAnnualLeaveData.daysLeft = 0;
                                //     }
                                // } else {
                                //     this.employeeAnnualLeaveData.daysLeft =
                                //         this.employeeAnnualLeaveData
                                //             .numberOfAnnualLeave +
                                //         this.employeeAnnualLeaveData
                                //             .annualLeaveLastYear -
                                //         this.employeeAnnualLeaveData.daysUsed;
                                // }
                            });
                    });
                // this.getFileInfos();

            });
        } else {
            this.saveButtonOptions.text = this.l("Save");
            this.title = "Tạo mới đơn nghỉ phép";
            this.haveReason = false;
            this.leaveApplicationData = new LeaveApplicationDto();
            this.leaveApplicationData.sendMail = true;
            this.isLeaveSendMailValue = true;
            this.leaveApplicationData.status =
                LeaveApplicationStatusValue.Registered;

            // this._commonService
            //     .getApprovalPeople(
            //         this.appSession.tenantId,
            //         this.appSession.user.departmentId,
            //         this.leaveApplicationData.status,
            //         false
            //     )
            //     .subscribe((result) => {
            //         this.lstUsersSign = result;
            //         this.dataCensor = new CustomStore({
            //             loadMode: "raw",
            //             key: "value",
            //             load() {
            //                 return result;
            //             },
            //         });
            //         //this.onChanged();
            //     });

            // this._commonService.getApprovalPeopleNew(this.typeApproval, 1).subscribe(result => {
            //     this.dataCensor = new CustomStore({
            //         loadMode: "raw",
            //         key: "value",
            //         load() {
            //             return result;
            //         }
            //     })
            // })

            //this.getPeopleAprroval(this.typeApproval, this.leaveApplicationData.status);




            this.applicationTypeCurValue = null;
            this.leaveApplicationData.departmentId =
                this.appSession.user.departmentId;
            // Get EmployeeInfoHrm
            this._employeeInfoService
                .getBySubscriberEmail(this.appSession.user.emailAddress)
                .subscribe((result) => {
                    this.employeeInfoData = result;

                    // Get employeeAnnualLeave
                    this._employeeAnnualLeaveService
                        .getAnuualByEmployeeId(this.appSession.user.id, this.employeeInfoData.employeeId)
                        .subscribe((result) => {
                            this.employeeAnnualLeaveData = result;
                            // if (moment().month() > 2) {
                            //     if (
                            //         this.employeeAnnualLeaveData.daysUsed >
                            //         this.employeeAnnualLeaveData
                            //             .annualLeaveLastYear &&
                            //         this.employeeAnnualLeaveData
                            //             .annualLeaveThisYearUsed == 0
                            //     ) {
                            //         this.employeeAnnualLeaveData.annualLeaveThisYearUsed =
                            //             this.employeeAnnualLeaveData.daysUsed -
                            //             this.employeeAnnualLeaveData
                            //                 .annualLeaveLastYear;
                            //     }
                            //     this.employeeAnnualLeaveData.daysLeft =
                            //         this.employeeAnnualLeaveData
                            //             .numberOfAnnualLeave -
                            //         this.employeeAnnualLeaveData
                            //             .annualLeaveThisYearUsed;

                            //     if (this.employeeAnnualLeaveData.daysLeft < 0) {
                            //         this.employeeAnnualLeaveData.daysLeft = 0;
                            //     }
                            // } else {
                            //     this.employeeAnnualLeaveData.daysLeft =
                            //         this.employeeAnnualLeaveData
                            //             .numberOfAnnualLeave +
                            //         this.employeeAnnualLeaveData
                            //             .annualLeaveLastYear -
                            //         this.employeeAnnualLeaveData.daysUsed;
                            // }
                        });
                });
        }
        //this.onChanged();
        this.popupVisible = true;
    }

    saveButtonClick(e) {

        // this.needDirection = false;
        if (this.leaveTypeValue === 1) {
            this.numberOfDayOffValue = 0.5;
            this.fromDateValue = moment(
                this.leaveApplicationData.fromDate,
                "DD-MM-YYYY"
            );
            this.toDateValue = moment(
                this.leaveApplicationData.toDate,
                "DD-MM-YYYY"
            );
            if (this.leaveApplicationData.fromDate && this.leaveApplicationData.toDate) {
                if (this.fromDateValue.diff(this.toDateValue)) {
                    this.notify.warn(
                        "Loại nghỉ phép này chỉ áp dụng cho nghỉ 1 ngày"
                    );
                    return;
                }
            }
        }
        const isValid = this.leaveApplicationForm.instance.validate().isValid;
        if (!isValid) {
            return;
        }
        this.leaveApplicationData.applicationTypeId = this.applicationTypeCurValue;
        this.leaveApplicationData.censorId = this.censorValue;
        this.leaveApplicationData.authorizedPersonId = this.authorizedValue;

        this.leaveApplicationData.relatedPeopleList = EOffHelper.convertListToString(this.gridBoxRelatedPeopleValue);
        this.leaveApplicationData.relatedGroupList = EOffHelper.convertListToString(this.gridBoxRelatedPeopleGroupValue);
        this.leaveApplicationData.typeApprovalId = this.typeApproval;

        // Kiểm tra ngày của đơn
        if (this.numberOfDayOffValue <= 0) {
            this.notify.error("Kiểm tra lại ngày đăng ký nghỉ của bạn");
            return;
        }
        // Kiểm tra xem là edit or add


        if (this.leaveApplicationData.id != null && this.leaveApplicationData.id != 0) {
            // Cap nhat don nghi
            Promise.all([
                this._leaveApplicationTypeService
                    .getById(this.applicationTypeCurValue)
                    .toPromise(),
                this._leaveApplicationTypeService
                    .getById(this.applicationTypePreValue)
                    .toPromise(),
            ]).then((result) => {
                this.leaveApplicationTypeDataCur = result[0];
                this.leaveApplicationTypeDataPre = result[1];
                // const checkBackDate = this.CheckBackDate(this.leaveApplicationData);
                // if (checkBackDate != true) {
                //     this.notify.error("Ngày xin nghỉ phép phải lớn hơn ngày tạo đơn ít nhất 1 ngày!");
                //     return;
                // }
                this.leaveApplicationData.isHalfDayLeave = this.leaveApplicationTypeDataCur.isHalfDayOff;
                this.leaveApplicationData.isWeekendLeave = this.isLeaveWeekendValue;
                //this.leaveApplicationData.status = 1;
                this.leaveApplicationData.creationTime = moment();
                this._leaveApplicationService
                    .update(this.leaveApplicationData)
                    .toPromise()
                    .then((rs) => {
                        if (this.employeeAnnualLeaveData.daysUsed < 0) {
                            this.employeeAnnualLeaveData.daysUsed = 0;
                        }
                        if (
                            this.employeeAnnualLeaveData
                                .annualLeaveThisYearUsed < 0
                        ) {
                            this.employeeAnnualLeaveData.annualLeaveThisYearUsed = 0;
                        }
                        this.onEditleaveApplicationCompleted.emit(
                            this.leaveApplicationData.id
                        );
                        this.notify.success("Cập nhật thành công");
                        this.router.navigateByUrl(
                            "/app/leave-registration/leave-application"
                        );
                        // this._NotifySignalrService.sendNotify(rs, (() => { }));
                        this.popupVisible = false;
                    })
                    .catch((error) => {
                        this.popupVisible = false;
                    });
            });
        } else {
            // Tao moi don nghi
            this.leaveApplicationData.subscriberId = this.appSession.user.id;
            //this.leaveApplicationData.status = 1;
            this.leaveApplicationData.creationTime = moment();
            this.leaveApplicationData.annualLeaveWhenCreate = this.employeeAnnualLeaveData.daysLeft;
            const LeaveYear = moment(this.leaveApplicationData.fromDate).year();
            // const checkBackDate = this.CheckBackDate(this.leaveApplicationData);
            // if (checkBackDate != true) {
            //     this.notify.error("Ngày xin nghỉ phép phải lớn hơn ngày tạo đơn ít nhất 1 ngày!");
            //     return;
            // }
            this._leaveApplicationTypeService
                .getById(this.applicationTypeCurValue)
                .subscribe((result) => {
                    this.leaveApplicationTypeDataCur = result;
                    if (
                        this.numberOfDayOffValue > this.employeeAnnualLeaveData.daysLeft
                        &&
                        this.leaveApplicationTypeDataCur.code.trim().toUpperCase().includes("P") 
                    ) {
                        this.notify.warn("Số phép bạn đăng ký vượt quá số phép còn lại. Vui lòng kiểm tra lại!");
                        return;
                    }
                    if (this.currentYear > LeaveYear
                        && this.numberOfDayOffValue > this.employeeAnnualLeaveData.annualLeaveLastYear
                        && this.leaveApplicationTypeDataCur.code.trim().toUpperCase().includes("P")) {
                        this.notify.error("Bạn không còn đủ phép của năm trước để đăng ký");
                        return;
                    }

                    this.leaveApplicationData.isHalfDayLeave = this.leaveApplicationTypeDataCur.isHalfDayOff;
                    this.leaveApplicationData.isWeekendLeave = this.isLeaveWeekendValue;
                    this._leaveApplicationService
                        .create(this.leaveApplicationData)
                        .toPromise()
                        .then((rs) => {
                            this.onEditleaveApplicationCompleted.emit(rs);
                            this.notify.success("Tạo mới thành công");
                            this.router.navigateByUrl(
                                "/app/leave-registration/leave-application"
                            );
                            // this._NotifySignalrService.sendNotify(rs, (() => { }));

                            this.popupVisible = false;
                        })
                        .catch((error) => {
                            this.popupVisible = false;
                        });
                });
        }

    }

    cancelEditButtonClick(e) {
        this.location.back();
    }

    onClickBack() {
        this.location.back();
    }

    isUpdating() {
        return this.router.url.includes(
            "/leave-registration/leave-application/edit"
        );
    }

    onValueChangedCensor(e) {
        this.censorValue = e.value;
    }
    onValueChangedAuthorized(e) {
        this.authorizedValue = e.value;
    }
    onValueChangedLeaveApplicationType(e) {
        if (this.leaveApplicationId == null || this.leaveApplicationId == undefined || this.leaveApplicationId == 0){
            this.leaveApplicationData.status = 1;
        }
        this.applicationTypeCurValue = e.value;
        this.applicationTypePreValue = e.previousValue;
        if (this.applicationTypeCurValue != null) {
            this.leaveTypevalueChange = false;
            this._leaveApplicationReasonServiceProxy.getByLeaveTypeId(this.applicationTypeCurValue).subscribe((result) => {

                this.lstApplicationReason = result;
                this.dataApplicationReason = new ArrayStore({
                    data: this.lstApplicationReason,
                    key: 'id'
                })
                this.isDataLoaded = true;

            })
        }
        if (
            (this.isGranted('Pages.LeaveRegistration.Approvel.LDP'))
            ||
            (this.isGranted('Pages.LeaveRegistration.Approvel.TN'))
            ||
            (this.isGranted('Pages.LeaveRegistration.Approvel.LDPTCHC'))
            ||
            (this.isGranted('Pages.LeaveRegistration.Approvel.PGD'))
            ||
            (this.isGranted('Pages.LeaveRegistration.Approvel.TGD'))
        ) {
            this.cantPickCensor = false
        } else {
            if (e.value != null) {
                this.hasLeaveType = true;
            } else {
                this.hasLeaveType = false;
            }
            let soNgayNghi = 0
            if (this.numberOfDayOffValue != undefined){
                soNgayNghi = this.numberOfDayOffValue
            }
            this._leaveApplicationService.getTypeApprove(soNgayNghi, e.value).subscribe(result =>{
                this.typeApproval = result;
                this._commonService
                .getLookups("StatusApproval", this.appSession.tenantId, result)
                .subscribe((result) => {
                    this.dataStatuses = new ArrayStore({
                        data: result,
                        key: "value",
                    });
                });
                this.calculateDaysOff();
            });
            //this.onChanged();
        }
    }

    numberOfDayValueChanged(e){
        if (this.leaveApplicationId == null || this.leaveApplicationId == undefined || this.leaveApplicationId == 0){
            this.leaveApplicationData.status = 1;
        }
        let loaiNghiPhep = 0;
        if (this.applicationTypeCurValue != undefined){
            loaiNghiPhep = this.applicationTypeCurValue;
        }
        this._leaveApplicationService.getTypeApprove(e.value, loaiNghiPhep).subscribe(result =>{
            this.typeApproval = result;
            this._commonService
                .getLookups("StatusApproval", this.appSession.tenantId, result)
                .subscribe((result) => {
                    this.dataStatuses = new ArrayStore({
                        data: result,
                        key: "value",
                    });
                });
            this.getPeopleAprroval(this.typeApproval,this.leaveApplicationData.status);
        });
    }

    getPeopleAprroval(typeAprroval: number, status: number){
        this._commonService.getApprovalPeopleNew(typeAprroval, status, 0).subscribe(result => {
            if (status == 1 && result.length == 0){
                this._commonService.getApprovalPeopleNew(typeAprroval, 2, 0).subscribe(result1 => {
                    this.leaveApplicationData.status = 2;
                    this.dataCensor = new CustomStore({
                        loadMode: "raw",
                        key: "value",
                        load() {
                            return result1;
                        }
                    })
                })
            }
            else{
                this.dataCensor = new CustomStore({
                    loadMode: "raw",
                    key: "value",
                    load() {
                        return result;
                    }
                })
            }
            
        })
    }

    onValueChangedLeaveApplicationReason(e) {
        this.leaveApplicationData.leaveApplicationReasonId = e.value;
    }

    onValueChangedDepartment(e) {
        this.leaveApplicationData.departmentId = e.value;
    }

    onValueChangedWeekend(e) {
        this.isLeaveWeekendValue = e.value;

        this.calculateDaysOff();
    }

    onValueChangedSendMail(e) {
        this.isLeaveSendMailValue = e.value;
    }

    saveButtonOptions = {
        icon: "save",
        text: this.l(""),
        stylingMode: "contained",
        type: "default",
        onClick: this.saveButtonClick.bind(this),
    };
    cancelEditButtonOptions = {
        icon: "close",
        text: this.l("Cancel"),
        stylingMode: "outlined",
        type: "normal",
        onClick: this.cancelEditButtonClick.bind(this),
    };
    relatedPeopleListButton = {
        text: this.l("Chọn người liên quan"),
        type: "default",
        onClick: () => {
            // this.groupSource = "UserGroups";
            //this.popupUserGroupVisible = true;
            this.userGroupOwnerPopup.ngOnInit(
                2,
                this.gridBoxRelatedPeopleGroupValue,
                this.gridDataRelatedPeopleGroupSource,
                this.gridDataRelatedPeopleSource,
                this.gridBoxRelatedPeopleValue,
                "multiple",
                "Chọn người thực hiện"
            );
            this.userGroupOwnerPopup.show();
        },
    };
    onEditCompletedOwner(id) {
        this.gridBoxRelatedPeopleValue = this.userGroupOwnerPopup.gridBoxValue;
        this.gridBoxRelatedPeopleGroupValue =
            this.userGroupOwnerPopup.gridBoxGroupValue;
        this.txtUserGrpRelatedPeopleSelection =
            this.userGroupOwnerPopup.txtUserGrpSelection;
    }


    checkLeave(symbol) {
        // Hàm kiểm tra và thực hiện hành động
        function kiemTraChuoi(symbol) {
            // Kiểm tra xem chuỗi có chứa ký tự sau "P" không
            if (symbol.includes('P')) {
                // Thực hiện hành động nếu điều kiện đúng

                // Thêm hành động cần thực hiện ở đây
            } else {
                // Thực hiện hành động khác nếu điều kiện sai

                // Thêm hành động cần thực hiện ở đây
            }
        }

        // Sử dụng hàm với một chuỗi cụ thể
        kiemTraChuoi('ABCDE'); // Chuỗi không chứa ký tự sau P
        kiemTraChuoi('PXYZ');  // Chuỗi chứa ký tự sau P
    }

    CheckBackDate(LeaveApplication: LeaveApplicationDto) {
        const FromDate = moment(LeaveApplication.fromDate);
        const CreationTime = moment(LeaveApplication.creationTime);
        const ToDate = moment(LeaveApplication.toDate);
        const originalDataLeaveReason = [...this.lstApplicationReason];
        const temData = originalDataLeaveReason.filter(item => item.id === LeaveApplication.leaveApplicationReasonId);
        const nghiDungHan = temData[0].nghiDungHan;
        const nghiQuahan = temData[0].nghiQuahan;
        if (nghiQuahan) {
            const dayAfterToDate = ToDate.add(1, "days");
            const isSatOrSun = dayAfterToDate.day() === 6 || dayAfterToDate.day() === 0;

            if (CreationTime.isSame(dayAfterToDate)) {
                return true;
            } else if (isSatOrSun && CreationTime.isSame(dayAfterToDate.day(1), 'date')) {
                return true;
            }

        } else if (nghiDungHan) {

            if (this.leaveApplicationData.numberOfDayOff >= 120 && moment().isSameOrBefore(FromDate.subtract(5, 'days'), 'date')) {
                return false;
            } else if (FromDate.isSameOrBefore(moment(), 'date')) {
                return false;
            } else {
                return true;
            }

        }

    }


}
