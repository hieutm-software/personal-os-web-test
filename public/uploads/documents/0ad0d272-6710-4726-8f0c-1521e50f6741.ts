import { Component, Injector, OnInit, ViewChild } from '@angular/core';
import { Location } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { appModuleAnimation } from '@shared/animations/routerTransition';
import { AppComponentBase } from '@shared/common/app-component-base';
import {
    CommonServiceServiceProxy,
    DocumentDirectionListDto,
    DocumentDto,
    DocumentServiceProxy,
    DocumentWatcherDto,
    DocumentWatcherListDto,
    DocumentWatcherServiceProxy,
    ERPComboboxItem,
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
import { HttpClient, HttpParams } from '@angular/common/http';
import { isNil } from 'lodash';
import { TransferDocumentComponent } from '@app/document/document-in/tranfer-document/transfer-document.component';
import { TokenService } from 'abp-ng2-module/dist/src/auth/token.service';
import { PreviewPdfComponent } from '@app/shared/common/preview-pdf/preview-pdf.component';
import { DxDataGridComponent, DxFormComponent } from '@node_modules/devextreme-angular';
import { CreateOrUpdateLeaveApprovalAuthorizationComponent } from './create-or-update-authorization/create-or-update-authorization.component';
import { Paginator } from '@node_modules/primeng/primeng';
import swal from "sweetalert2/src/sweetalert2.js";
import { LeaveApplicationHelper } from '@shared/helpers/LeaveApplicationHelper';

@Component({
    selector: 'app-leave-approval-authorization',
    templateUrl: './leave-approval-authorization.component.html',
    styleUrls: ['./leave-approval-authorization.component.css'],
    animations: [appModuleAnimation()],
})
export class LeaveApprovalAuthorizationComponent extends AppComponentBase implements OnInit {
    @ViewChild('dataGrid', { static: true }) dataGrid: DxDataGridComponent;
    @ViewChild('createOrUpdateLeaveApprovalAuthorization', { static: true }) createOrUpdateLeaveApprovalAuthorization: CreateOrUpdateLeaveApprovalAuthorizationComponent;
    @ViewChild('paginator', { static: true }) paginator: Paginator;
    // @ViewChild('filterBox', { static: false }) filterBox: FilterKetquaChamCongComponent;
    @ViewChild('formFilter', { static: true }) formFilter: DxFormComponent;
    dataSource: any;
    lstChamCongType: ERPComboboxItem[] = [];
    lstStatuses: any[] = [];
    filterText: '';
    advancedFiltersAreShown: boolean;

    needResetPageIndex = false;

    constructor(
        injector: Injector,
        private router: Router,
        private _httpClient: HttpClient,
        private _commonService: CommonServiceServiceProxy,
        private _leaveApprovalAuthorizationService: LeaveApprovalAuthorizationServiceProxy,
    ) {
        super(injector);
    }

    ngOnInit() {
        abp.event.trigger('urlChanged');
        this.allowUpdating = this.allowUpdating.bind(this);
        this.allowDeleting = this.allowDeleting.bind(this);
        this.onView = this.onView.bind(this);
        this.onEdit = this.onEdit.bind(this);
        this.onDelete = this.onDelete.bind(this);
        this.getAll();
        this.advancedFiltersAreShown = false;

        this._commonService.getLookups('ChamCongType', this.appSession.tenantId, undefined).subscribe(result => {
            this.lstChamCongType = result;
        })
        this.lstStatuses = LeaveApplicationHelper.getAllStatusAuthorization();

        this.onFilterButtonClick = this.onFilterButtonClick.bind(this);
        this.onClearButtonClick = this.onClearButtonClick.bind(this);
    }

    reloadPage(): void {
        this.needResetPageIndex = true;
        this.paginator.changePage(this.paginator.getPage());
    }

    filterByText() {
        this.dataGrid.instance.searchByText(this.filterText.trim());
    }

    search() {
        if (this.advancedFiltersAreShown) {
            this.getAll();
        } else {
            this.filterByText()
        }
    }

    OnTextChange(e) {
        if (this.filterText.length === 0) {
            this.search();
        }
    }

    // create() {
    //     this.router.navigateByUrl('app/cham-cong/cham-cong/createKetQua')
    // }

    allowUpdating(e) {
        return this.isGranted("Pages.LeaveRegistration.LeaveApprovalAuthorization.Edit");
    }

    allowDeleting(e) {
        return this.isGranted("Pages.LeaveRegistration.LeaveApprovalAuthorization.Delete");
    }

    onEdit(e) {
        this.createOrUpdateLeaveApprovalAuthorization.leaveApplicationAuthorizationId = e.row.data.id;
        this.createOrUpdateLeaveApprovalAuthorization.readOnly = false;
        this.createOrUpdateLeaveApprovalAuthorization.intFormData();
        this.createOrUpdateLeaveApprovalAuthorization.show();
    }

    onView(e) {
        this.createOrUpdateLeaveApprovalAuthorization.leaveApplicationAuthorizationId = e.row.data.id;
        this.createOrUpdateLeaveApprovalAuthorization.readOnly = true;
        this.createOrUpdateLeaveApprovalAuthorization.intFormData();
        this.createOrUpdateLeaveApprovalAuthorization.show();
    }

    onCreate() {
        this.createOrUpdateLeaveApprovalAuthorization.readOnly = false;
        this.createOrUpdateLeaveApprovalAuthorization.leaveApplicationAuthorizationId = null;
        this.createOrUpdateLeaveApprovalAuthorization.intFormData();
        this.createOrUpdateLeaveApprovalAuthorization.show();
    }

    // onView(e) {
    //     let id = e.row.data.id;
    //     if (e.row.data.idParent != 0 && e.row.data.idParent != null) {
    //         id = e.row.data.idParent;
    //     }

    //     this.router.navigateByUrl('/app/cham-cong/danhmuc-ketqua/view-details/' + id);
    // }

    // onEdit(e) {
    //     let id = e.row.data.id;
    //     if (e.row.data.idParent != 0 && e.row.data.idParent != null) {
    //         id = e.row.data.idParent;
    //     }
    //     this.router.navigateByUrl('/app/cham-cong/cham-cong/edit/' + id);
    // }

    onDelete(e) {
        swal.fire({
            title: this.l("Xóa đơn ủy quyền này"),
            text: this.l("Bạn có chắc muốn xóa đơn ủy quyền này ?"),
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: this.l("Yes"),
            cancelButtonText: this.l("Cancel")
        }).then((result) => {
            if (result.value) {
                this._leaveApprovalAuthorizationService.delete(e.row.data.id).subscribe((result) => {
                    if (result) {
                        this.clearSelection();
                        this.dataGrid.instance.refresh();
                        this.notify.success(this.l("Xóa thành công"))
                    } else {
                        this.notify.error(this.l("Xóa thất bại"));
                    }
                    this.reloadPage();
                });
            }
        })
    }
    onCellPrepared(e) {
        // console.log('e----------------', e);
        if (e.rowType === "header" && e.column.caption == "Thao tác") {
            // e.cellElement.style.textAlign = 'right';
            e.cellElement.style.color = "#959595";
        }
    }
    getAll() {
        const self = this;
        this.dataSource = {};
        this.dataSource.store = new CustomStore({
            key: 'id',
            load(loadOptions: any) {
                const maxResultCount = loadOptions.take || 10;
                const skipCount = loadOptions.skip || 0;
                let sorting = '';

                if (loadOptions.sort) {
                    if (sorting.length > 0) {
                        sorting += ', ' + loadOptions.sort[0].selector;
                    } else {
                        sorting += loadOptions.sort[0].selector;
                    }

                    if (loadOptions.sort[0].desc) {
                        sorting += 'desc';
                    } else {
                        sorting += 'asc';
                    }
                }

                if (self.advancedFiltersAreShown) {
                    self.filterText = '';
                }

                return self._leaveApprovalAuthorizationService.getAll(self.filterText, sorting, maxResultCount, skipCount)
                    .toPromise()
                    .then((response: any) => {
                        response.items.map((i, key) => {
                            i.index = key + 1;

                            if (i.gioVaoTu == null && i.gioVaoDen == null) {
                                i.gioVaoStringAbc = "";
                            } else {
                                i.gioVaoStringAbc = i.gioVaoString + " - " + i.gioVaoDenString;
                            }

                            if (i.gioRaTu == null && i.gioRaDen == null) {
                                i.gioRaStringAbc = "";
                            } else {
                                i.gioRaStringAbc = i.gioRaString + " - " + i.gioRaDenString;
                            }
                        })
                        return {
                            data: response.items,
                            totalCount: response.totalCount
                        }
                    })
                    .catch(error => {
                        self.notify.error(this.l("Load thất bại"))
                    })
            }
        })
    }

    isNotEmpty(value: any): boolean {
        return value !== undefined && value !== null && value !== "";
    }

    clearSelection() {
        this.dataGrid.instance.clearSelection();
        this.dataGrid.instance.option("focusedRowIndex", -1);
    }

    onFilterButtonClick() {
        this.getAll();
    }

    onClearButtonClick() {
        this.formFilter.instance.resetValues();
    }
}
