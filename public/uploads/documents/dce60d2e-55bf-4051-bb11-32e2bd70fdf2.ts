import { ChangeDetectorRef, Component, Injector, Input, OnInit, ViewChild } from '@angular/core';
import { AppComponentBase } from '@shared/common/app-component-base';
import { LeaveApplicationHelper } from '@shared/helpers/LeaveApplicationHelper';
import { LeaveApplicationLogDto, LeaveApplicationLogServiceProxy } from '@shared/service-proxies/service-proxies';
import { DxDataGridComponent } from 'devextreme-angular';
import CustomStore from 'devextreme/data/custom_store';
import { isNil } from 'lodash';

@Component({
    selector: 'app-application-logs',
    templateUrl: './application-logs.component.html',
    styleUrls: ['./application-logs.component.css']
})
export class ApplicationLogsComponent extends AppComponentBase {
    @Input() leaveApplicationId: number;
    @ViewChild("dataGrid", { static: false }) dataGrid: DxDataGridComponent;
    dataStatuses: any;
    dataSource: any;
    filterText = "";
    constructor(
        injector: Injector,
        private _leaveApplicationLogService: LeaveApplicationLogServiceProxy,
        private cdr: ChangeDetectorRef
    ) {
        super(injector);
    }

    ngOnInit() {
        this.dataStatuses = LeaveApplicationHelper.getAllLeaveApplicationStatusesList();
        this.getAll();
        // this._leaveApplicationLogService.getByLeaveApplicationId(this.leaveApplicationId).subscribe((res) => {
        //     console.log(res);
        //     this.dataSource = res;
        // })

    }
    // getAll() {
    //     var self = this;
    //     self.dataSource = {};
    //     self.dataSource.store = new CustomStore({
    //         key: "id",
    //         load(loadOptions: any) {
    //             return self._leaveApplicationLogService
    //                 .getByLeaveApplicationId(self.leaveApplicationId)
    //                 .toPromise()
    //                 .then((response: any) => {
    //                     console.log(response);
                        

    //                     return {
    //                         data: response.items,

    //                         totalCount: response.totalCount,
    //                     };
    //                 })
    //                 .catch((error) => {
    //                     console.log(error);
    //                     self.notify.error(self.l("DataLoadingFailed")); // throw 'Data Loading Error';
    //                 });
    //         }
    //     });
    //     console.log(self.dataSource);
        
    // }

    getAll() {
        const self = this;
        console.log(self.leaveApplicationId);
        
        self.dataSource = {};
        self.dataSource.store = new CustomStore({
            key: "id",
            load(loadOptions: any) {
                const maxResultCount = loadOptions.take || 10;
                const skipCount = loadOptions.skip || 0;
                const sorting = "creationTime desc"; //creationTime desc

                // if (self.advancedFiltersAreShown) {
                //   self.filterText = '';
                // }
                const STT = 0;

                return self._leaveApplicationLogService
                    .getAll(
                        self.filterText,
                        self.leaveApplicationId,
                        sorting,
                        maxResultCount,
                        skipCount
                    )
                    .toPromise()
                    .then((response: any) => {
                        
                        
                        response.items.forEach((item) => {
                            item.status =
                                LeaveApplicationHelper.getLeaveApplicationStatusByValue(
                                    item.status
                                );
                        });
                        console.log(response);
                        return {
                            data: response.items,

                            totalCount: response.totalCount,
                        };
                    })
                    .catch((error) => {
                        console.log(error);
                        self.notify.error(self.l("DataLoadingFailed")); // throw 'Data Loading Error';
                    });
            }
        });
        console.log(self.dataSource);
        
    }

}
