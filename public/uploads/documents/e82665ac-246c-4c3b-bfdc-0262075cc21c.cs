using Abp.Application.Services.Dto;
using Abp.AutoMapper;
using System;
using System.Collections.Generic;
using System.Text;

namespace ERP.Business.LeaveApplication.Dto
{
    [AutoMapTo(typeof(Models.Business.LeaveApplication))]
    public class UpdateStatusLeaveApplicationDto : EntityDto<long>
    {
        public long? ApproverId { get; set; }
        public DateTime? ApprovedDate { get; set; }
        public long SubscriberId { get; set; } //Nguoi dang ky nghi phep
        public long? CensorId { get; set; }
        public int Status { get; set; }
        public string Note { get; set; }

        public long? AuthorizedByUserId { get; set; }
        public bool? IsComplete { get; set; }
        public string CodeStatus { get; set; }
    }
}