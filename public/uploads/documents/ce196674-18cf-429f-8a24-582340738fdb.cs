using Abp.Application.Services.Dto;
using Abp.AutoMapper;
using System;
using System.Collections.Generic;
using System.Text;

namespace ERP.Business.LeaveApplication.Dto
{
    [AutoMapTo(typeof(Models.Business.LeaveApprovalAuthorization))]
    public class LeaveApprovalAuthorizationDto : EntityDto<long>
    {
        public string Number { get; set; }
        public DateTime? Date { get; set; }
        public long? AuthorizerId { get; set; }
        public string AuthorizerName { get; set; }
        public long? AuthorizedPersonId { get; set; }
        public string AuthorizedPersonName { get; set; }
        public string Content { get; set; }
        public DateTime ValideFromDate { get; set; }
        public DateTime ValideToDate { get; set; }
        public string Attachments { get; set; }
        public Boolean IsActive { get; set; }
        public int Status { get; set; }
    }
}
