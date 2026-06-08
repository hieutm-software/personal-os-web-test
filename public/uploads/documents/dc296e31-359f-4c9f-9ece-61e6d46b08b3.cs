using Abp.Application.Services;
using ERP.Business.LeaveApplication.Dto;
using System;
using System.Collections.Generic;
using System.Text;
using System.Threading.Tasks;

namespace ERP.Business.LeaveApplication
{
    internal interface ILeaveApplicationLogAppService : IApplicationService
    {
        Task<LeaveApplicationLogDto> GetId(long id);
        Task<List<LeaveApplicationLogDto>> GetByLeaveApplicationId(long id);
        Task<long> Create(LeaveApplicationLogDto input);
        Task Update(LeaveApplicationLogDto input);
        Task<bool> Delete(long id);
    }
}
