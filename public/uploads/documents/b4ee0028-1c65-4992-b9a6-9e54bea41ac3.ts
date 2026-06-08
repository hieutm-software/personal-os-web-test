import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, EventEmitter, Injector, OnInit, Output, ViewChild } from '@angular/core';
import { ViewDeploymentIdeaDetailComponent } from '@app/sangkien/shared/view-deployment-idea-detail/view-deployment-idea-detail.component';
import { appModuleAnimation } from '@shared/animations/routerTransition';
import { AppConsts } from '@shared/AppConsts';
import { AppComponentBase } from '@shared/common/app-component-base';
import { CommonServiceServiceProxy, ERPComboboxItem, EmployeeInfoServiceProxy, HomeContentServiceProxy, IdeaDto, IdeaServiceProxy } from '@shared/service-proxies/service-proxies';
import { DxFormComponent } from 'devextreme-angular';
import Popup from 'devextreme/ui/popup';
import Device from 'devextreme/core/devices';
import { PreviewFileComponent } from '@app/shared/common/preview-file/preview-file.component';
import moment from 'moment';
import { ListBirthdayComponent } from '@app/list-birthday/list-birthday.component';
import { result } from 'lodash';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css'],
  animations: [appModuleAnimation()]
})
export class HomeComponent extends AppComponentBase {
  // @ViewChild("filterForm", { static: true }) filterForm: DxFormComponent;
  @ViewChild(ViewDeploymentIdeaDetailComponent, { static: false }) viewDeploymentIdeaDetail: ViewDeploymentIdeaDetailComponent;
  @ViewChild(PreviewFileComponent, { static: true }) previewFilePopup: PreviewFileComponent;
  @ViewChild(ListBirthdayComponent, { static: true }) lstBirthPopup: ListBirthdayComponent;

  @Output() hide: EventEmitter<void> = new EventEmitter();
  filterData = {
    filterText: '',
    unitID: null,
    touchPointID: null,
    authors: '',
    forYear: null
  };
  ideas: IdeaDto[] = [];

  filePath: any;

  img: any;

  slideshowDelay = 3000;

  dataSource: string[];
  popupVisible: boolean = false;
  popupListVisible: boolean = false;
  HPBDVisible: boolean = false;
  HPBDListVisible: boolean = true;
  dateOfBirth;
  dateClose;


  lstUnits: ERPComboboxItem[] = [];
  lstDepartments: ERPComboboxItem[] = [];
  lstTouchPoints: ERPComboboxItem[] = [];
  backendURL = AppConsts.remoteServiceBaseUrl + '/';
  URL_HDSD = '';
  noImageURL = AppConsts.remoteServiceBaseUrl + '/images/noimage.png';
  viewDetailPopupVisible = false;
  activeIdeaId: number;
  now: Date = new Date();

  currentValue: Date = new Date();

  minDateValue: Date | null = null;

  maxDateValue: Date | null = null;

  disabledDates: Function | null = null;

  zoomLevels: string[] = [
    'month', 'year', 'decade', 'century',
  ];

  cellTemplate = 'cell';

  holidays: any = [[1, 0], [4, 6], [25, 11]];

  isWeekend(date) {
    const day = date.getDay();

    return day === 0 || day === 6;
  }

  getCellCssClass({ date, view }) {
    let cssClass = '';

    if (view === 'month') {
      if (!date) {
        cssClass = 'week-number';
      } else {
        if (this.isWeekend(date)) { cssClass = 'weekend'; }

        this.holidays.forEach((item) => {
          if (date.getDate() === item[0] && date.getMonth() === item[1]) {
            cssClass = 'holiday';
            return false;
          }
        });
      }
    }

    return cssClass;
  }
  constructor(injector: Injector,
    private _httpClient: HttpClient,
    private _ideaService: IdeaServiceProxy,
    private _commonService: CommonServiceServiceProxy,
    private _homeContentService: HomeContentServiceProxy,
    private _employeeInfoService: EmployeeInfoServiceProxy,
  ) {
    super(injector);

    this.onViewSubmission = this.onViewSubmission.bind(this);

    this.getAllDeployment();

    this.onFilterClick = this.onFilterClick.bind(this);
    this.onClickHDSD = this.onClickHDSD.bind(this);
    this.cancelEditButtonClick = this.cancelEditButtonClick.bind(this);
    
    this.onClickHPBD = this.onClickHPBD.bind(this);
    this.getBannerImageURLList();
    this.onClickHPBDList = this.onClickHPBDList.bind(this);
    
  }

  ngOnInit() {
    abp.event.trigger('urlChanged');
    this._commonService.getLookups('Units', this.appSession.tenantId, undefined).subscribe(result => {
      this.lstUnits = result;
    });
    this._commonService.getListOfValue('URL_HDSD', this.appSession.tenantId).subscribe(result => {
      this.URL_HDSD = result[0].displayText;
    });

    this._commonService.getLookups('Department', this.appSession.tenantId, undefined).subscribe(result => {
      this.lstDepartments = result;
    });

    this._commonService.getLookups('TouchPoint', this.appSession.tenantId, undefined).subscribe(result => {
      this.lstTouchPoints = result;
    });
    
    
    this._employeeInfoService.getBySubscriberEmail(this.appSession.user.emailAddress).subscribe(result => {
      this.dateOfBirth = result.ngaySinh;
      this.dateClose = result.dateClose;
      if (this.dateOfBirth.format("DD/MM") == moment().format("DD/MM") &&
          this.dateClose.format("DD/MM/YYYY") != moment().format("DD/MM/YYYY")){
        this.popupVisible = true;
      }
    })
    
    this._employeeInfoService.getBySubscriberEmail(this.appSession.user.emailAddress).subscribe(result => {
      this.dateOfBirth = result.ngaySinh;
      if (this.dateOfBirth.format("DD/MM") == moment().format("DD/MM")){
        this.HPBDVisible = true;
      }
    })

    this._employeeInfoService.getListBirthDay(this).subscribe(result => {
      if(result == null){
        this.HPBDListVisible = false;
      }
    })

    this.setPopupOption();
  
  }

  private setPopupOption() {
    const deviceType = Device.current().deviceType;

    Popup.defaultOptions({
      device: { deviceType: deviceType },
      options: {
        fullScreen: deviceType == 'phone' || deviceType == 'tablet' ? true : false
      },
    });
  }
  onClickHDSD() {
    console.log(111);
    const filePath = AppConsts.remoteServiceBaseUrl + this.URL_HDSD;
    const link = document.createElement('a');
    link.setAttribute('target', '_blank');
    link.setAttribute('responseType', 'arraybuffer');
    link.setAttribute('href', filePath);
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
  isNotEmpty(value: any): boolean {
    return value !== undefined && value !== null && value !== '';
  }


  getAllDeployment() {
    this._ideaService.getNonSecurityDeployment(this.filterData.filterText, this.filterData.unitID, this.filterData.touchPointID, this.filterData.authors, this.filterData.forYear).subscribe(result => {
      this.ideas = result;
    });
  }

  onFilterClick(e) {
    this.getAllDeployment();
  }

  onDeleteFilterButtonClick(e) {
    // this.filterForm.instance.resetValues();
  }

  onViewSubmission(id, e) {
    this.viewDeploymentIdeaDetail.ideaId = id;
    this.viewDeploymentIdeaDetail.intFormData();
    this.viewDetailPopupVisible = true;
  }

  onHidden(e) {
    this.viewDetailPopupVisible = false;
  }
  valueChanged(e) {
    this.slideshowDelay = e.value ? 3000 : 0;
  }

  getBannerImageURLList() {
    this._homeContentService.getBannerImageURLList().subscribe((result) => { this.dataSource = result })
  }

  cancelEditButtonClick(){
    this.popupVisible = false;
    this._employeeInfoService.getUpdateDateClose(this.appSession.user.emailAddress).subscribe(()=>{})
  }

  cancelListButtonClick(){
    this.popupListVisible = false;
  }

  onClickHPBD(){
    this.popupVisible = true;
  }

  onClickHPBDList(){
    this.lstBirthPopup.getAll();
    this.popupListVisible = true;
  }
  onHPBDHiden(){
    this.popupVisible = false;
    //this.hide.emit();
  }
}
