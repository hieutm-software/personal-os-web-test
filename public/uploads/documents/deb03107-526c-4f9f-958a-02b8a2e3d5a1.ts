import { Component, Injector, OnInit, ViewChild } from '@angular/core';
import { appModuleAnimation } from '@shared/animations/routerTransition';
import { DxDataGridComponent, DxFormComponent } from 'devextreme-angular';
import { EmployeeInfoServiceProxy } from '@shared/service-proxies/service-proxies';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { AppComponentBase } from '@shared/common/app-component-base';
import CustomStore from 'devextreme/data/custom_store';
import { AppConsts } from '@shared/AppConsts';
import { Table } from 'primeng/table';

@Component({
  selector: 'app-list-birthday',
  templateUrl: './list-birthday.component.html',
  styleUrls: ['./list-birthday.component.css'],
  animations: [appModuleAnimation()]
})
export class ListBirthdayComponent extends AppComponentBase{
  @ViewChild('dataGrid', { static: true }) dataGrid: DxDataGridComponent;
  @ViewChild('formFilter', { static: true }) formFilter: DxFormComponent;
  @ViewChild('dataTable', { static: true }) dataTable: Table;

  dataSource: any;
  listVisible: boolean = false;
  idCur: any;
  detailData: any;
  wish: any;
  constructor(
    private _httpClient: HttpClient,
    injector: Injector,
    private _employeeInfoService: EmployeeInfoServiceProxy,
  ) {
    super(injector); 
    this.listChosen = this.listChosen.bind(this);
    
    this.onEdit = this.onEdit.bind(this);
    
    this.cancelClick = this.cancelClick.bind(this);
  }
  
  
  ngOnInit() {
    abp.event.trigger('urlChanged');
  }

  onEdit(e) {
    this.listVisible = true;
    this.idCur = e.row.data.id;
  }
  
  listChosen(){
    //console.log(this.opinionDetailData.content, this.idCur);
    this.wish = this.detailData.content;
    if(this.wish == null){
      this.notify.error(this.l("Bạn chưa nhập lời chúc"));
    }
    else{
      this._employeeInfoService.getSendMailBirthDay(this.wish, this.idCur).subscribe(() => {});
      
      this.notify.success(this.l("Lời chúc của bạn đã được gửi đi!"));
      this.listVisible = false;
      this.detailData.content = null;
    }
  
  }

  cancelClick(){  
    this.listVisible = false;
  }

  getAll() {
    const self = this;
    self.dataSource = {};
    self.dataSource.store = new CustomStore({
      key: "",
      load(loadOptions: any) {
        let params: HttpParams = new HttpParams();

        [
          "skip",
          "take",
          "requireTotalCount",
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
        return self._httpClient.get(AppConsts.remoteServiceBaseUrl + '/api/services/app/EmployeeInfo/GetListBirthDay', { params: params })
          .toPromise()
          .then((respone: any) => {
            respone.result.data.map((i, key) => {
              i.order = key + 1;
            })
            return {
              data: respone.result.data,
              totalCount: respone.result.totalCount
            };
          })
          .catch(error => {
            self.notify.error(self.l('DataLoadingFailed'))
          });
      },
    })
  }

  isNotEmpty(value: any): boolean {
    return value !== undefined && value !== null && value !== "";
  }

  reloadPage(): void {
    this.dataGrid.instance.refresh();
  }
}
