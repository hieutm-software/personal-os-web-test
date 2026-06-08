import { Component, EventEmitter, HostListener, Injector, Input, OnInit, Output, ViewChild } from '@angular/core';
import { appModuleAnimation } from '@shared/animations/routerTransition';
import { AppConsts } from '@shared/AppConsts';
import { AppComponentBase } from '@shared/common/app-component-base';
import { PreviewElements } from 'devexpress-reporting/dx-webdocumentviewer'
import { DxReportViewerComponent } from 'devexpress-reporting-angular';
import { ModalDirective } from 'ngx-bootstrap/modal';

@Component({
  selector: 'app-report-viewer2',
  templateUrl: './report-viewer2.component.html',
  styleUrls: ['./report-viewer2.component.css'],
  animations: [appModuleAnimation()]
})
export class ReportViewer2Component extends AppComponentBase {
  @ViewChild(DxReportViewerComponent, { static: false }) viewer: DxReportViewerComponent;
  @ViewChild('reportViewerPopup', { static: true }) reportViewerPopup: ModalDirective;

  title = 'DXReportViewer';
  screenHeight: any;
  @Input() reportUrl: string = '';
  @Input() parameters: Map<string, any>;
  @Output() onClose: EventEmitter<any> = new EventEmitter();
  @Output() onPrint: EventEmitter<any> = new EventEmitter();

  hostUrl: string = "https://eofficereport.aits.vn";

  // Use this line if you use an ASP.NET MVC backend
  //invokeAction: string = "/CustomWebDocumentViewer/Invoke";
  // Use this line if you use an ASP.NET Core backend
  invokeAction: string = '/DXXRDV';

  reportViewerVisible = false;

  constructor(injector: Injector) {
    super(injector);
    this.screenHeight = window.innerHeight;
  }

  ngOnInit() {
  }

  @HostListener('window:resize', ['$event'])
  onResize(event) {
    this.screenHeight = window.innerHeight;
  }



  openReport() {
    const self = this;
    this.reportViewerVisible = true;
    window.setTimeout(function () {
      let queryParams = "";
      self.parameters.forEach((value: any, key: string) => {

        if (queryParams !== "") {
          queryParams = queryParams + "&";
        }
        queryParams = queryParams + key + "=" + value;
      });

      self.viewer.bindingSender.OpenReport(self.reportUrl + "?" + queryParams);
      self.viewer.bindingSender.previewModel.reportPreview.zoom(1);
      self.viewer.bindingSender.previewModel.reportPreview.showMultipagePreview(true);

    }, 500)

    this.reportViewerPopup.show();
  }

  onCustomizeElements(event) {
    const rightPanel = event.args.GetById(PreviewElements.RightPanel);
    const index = event.args.Elements.indexOf(rightPanel);
    event.args.Elements.splice(index, 1);
  }

  onCustomizeMenuActions(event) {

    // var actionPrevPage = event.args.GetById(ActionId.PrevPage);
    // if (actionPrevPage)
    //   actionPrevPage.visible = false;
    // var actionNextPage = event.args.GetById(ActionId.NextPage);
    // if (actionNextPage)
    //   actionNextPage.visible = false;

  }

  onBeforeRender(e) {
    e.component.bindingSender.previewModel.reportPreview.zoom(1);
    e.component.bindingSender.previewModel.reportPreview.showMultipagePreview(true);
  }

  onDocumentReady(e) {
    // e.component.bindingSender.Print();
  }



  printButtonClick(): void {
    const self = this

    self.viewer.bindingSender.Print();
    this.onPrint.emit();

  }

  printButtonOptions = {
    icon: "print",
    text: this.l("Print"),
    stylingMode: 'outlined',
    type: 'default',
    onClick: this.printButtonClick.bind(this)
  }

  closeButtonOptions = {
    icon: "close",
    text: this.l("Close"),
    stylingMode: 'outlined',
    type: 'default',
    onClick: this.closeButtonClick.bind(this)
  }


  closeButtonClick(e) {
    this.reportViewerVisible = false;

  }

  onContentReady(e) {
    //e.on("dxmousewheel", function (e) {
    e.stopPropagation();
    //});
  }

  close(): void {
    this.reportViewerPopup.hide();
    this.onClose.emit();
  }
}
