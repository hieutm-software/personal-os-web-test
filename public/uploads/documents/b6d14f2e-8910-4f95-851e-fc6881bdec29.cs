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
    internal interface ILeaveApplicationAppService : IApplicationService
    {
        Task<PagedResultDto<LeaveApplicationDto>> GetLeaveApplications(FilterLeaveApplicationDto input);
        Task<PagedResultDto<LeaveApplicationDto>> GetLeaveOtherApplications(FilterLeaveApplicationDto input);

        Task<LeaveApplicationDto> GetById(long id);
        Task<LeaveApplicationDto> GetDetailsById(long id);

        Task Create(LeaveApplicationDto input);

        Task<NotificationDto> CreateHalfDayOff(LeaveApplicationDto input);

        Task<NotificationDto> Update(LeaveApplicationDto input);

        Task UpdateAnnual(UpdateAnnualLeaveApplicationDto input);

        Task UpdateReasonDelete(UpdateReasonDeleteDto input);

        //Task UpdateHalfDayoff(LeaveApplicationDto input);

        Task<NotificationDto> UpdateLeaveApplicationStatus(UpdateStatusLeaveApplicationDto input);
        Task<bool> Delete(long id);
        Task<PagedResultDto<LeaveNotApprovelDto>> GetLeaveNotApproved(FilterLeaveApplicationDto input);
        Task LeaveNotApprovalSendMail(LeaveNotApprovelDto data);
        Task<PagedResultDto<LeaveFastApprovelDto>> GetLeaveFastApproved(FilterLeaveApplicationDto input);
    }
}
