using Abp.Application.Services.Dto;
using Abp.AutoMapper;
using System;
using System.Collections.Generic;
using System.Text;

namespace ERP.Business.LeaveApplication.Dto
{
    [AutoMapTo(typeof(Models.Business.LeaveApplicationLog))]
    public class LeaveApplicationLogDto : EntityDto<long>
    {
        public long? LeaveApplicationId { get; set; }
        public long? ApproverId { get; set; }
        public string ApproverName { get; set; }
        public long? CensorId { get; set; }
        public string CensorName { get; set; }
        public DateTime? ApprovedDate { get; set; }
        public int Status { get; set; }
        public string Note { get; set; }
        public DateTime? FromDate { get;set; }
        public DateTime? ToDate { get;set; }
        public DateTime? CreationTime { get; set; }
        public DateTime? LastModificationTime { get; set; }
        public string NameStatus {  get; set; }
    }
}
