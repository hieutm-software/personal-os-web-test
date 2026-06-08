using Abp.Application.Services;
using Abp.Application.Services.Dto;
using ERP.Business.Document.Dto;
using ERP.Business.LeaveApplication.Dto;
using ERP.Business.PushNotification.Dto;
using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;

namespace ERP.Business.LeaveApplication
{
    internal interface ILeaveApprovalAuthorizationAppService : IApplicationService
    {
        Task<long> Create(LeaveApprovalAuthorizationDto input);
        Task<LeaveApprovalAuthorizationDto> GetId(long id);
        Task Update(LeaveApprovalAuthorizationDto input);
        Task<bool> Delete(long id);
        Task<PagedResultDto<LeaveApprovalAuthorizationDto>> GetAll(FilterLeaveApprovalAuthorizationDto input);
    }
}
