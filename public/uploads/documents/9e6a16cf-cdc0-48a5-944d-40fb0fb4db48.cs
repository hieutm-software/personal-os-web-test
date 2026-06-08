using Abp.Application.Services.Dto;
using Abp.Domain.Repositories;
using Abp.Extensions;
using Abp.Linq.Extensions;
using Abp.UI;
using ERP.Authorization.Users;
using ERP.Business.LeaveApplication.Dto;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Dynamic.Core;
using System.Threading.Tasks;
using ERP.Models.Business;

namespace ERP.Business.LeaveApplication
{
    public class LeaveApprovalAuthorizationAppService : ERPAppServiceBase, ILeaveApprovalAuthorizationAppService
    {
        private readonly IRepository<LeaveApprovalAuthorization, long> _leaveApprovalAuthorizationRepository;
        private readonly IRepository<User, long> _userRepository;
        private readonly UserManager _userManager;

        public LeaveApprovalAuthorizationAppService(
            IRepository<LeaveApprovalAuthorization, long> leaveApprovalAuthorizationRepository, 
            IRepository<User, long> userRepository,
            UserManager userManager
            )
        {
            _leaveApprovalAuthorizationRepository = leaveApprovalAuthorizationRepository;
            _userRepository = userRepository;
            _userManager = userManager;

        }

        public async Task<long> Create(LeaveApprovalAuthorizationDto input)
        {
            var item = ObjectMapper.Map<LeaveApprovalAuthorization>(input);
            item.TenantId = AbpSession.TenantId;
            item.IsActive = true;

            await _leaveApprovalAuthorizationRepository.InsertAsync(item);
            await CurrentUnitOfWork.SaveChangesAsync();
            return item.Id;
        }

        public async Task<LeaveApprovalAuthorizationDto> GetId(long id)
        {
            var entity = await _leaveApprovalAuthorizationRepository.FirstOrDefaultAsync(id);
            var dto = ObjectMapper.Map<LeaveApprovalAuthorizationDto>(entity);

            return dto;
        }

        public async Task Update(LeaveApprovalAuthorizationDto input)
        {
            var leaveAppLog = await _leaveApprovalAuthorizationRepository.FirstOrDefaultAsync(input.Id);
            ObjectMapper.Map(input, leaveAppLog);
        }

        public async Task<bool> Delete(long id)
        {
            try
            {
                await _leaveApprovalAuthorizationRepository.DeleteAsync(id);
                return true;
            }
            catch (Exception ex)
            {
                throw new UserFriendlyException(ex.Message);

            }
        }

        public async Task<PagedResultDto<LeaveApprovalAuthorizationDto>> GetAll(FilterLeaveApprovalAuthorizationDto input)
        {
            try
            {
                var user = await this.GetCurrentUserAsync();
                var userId = user.Id;
                var departmentId = user.DepartmentId.HasValue ? user.DepartmentId : 0;
                DateTime now = DateTime.Now;
                var queryable = _leaveApprovalAuthorizationRepository.GetAll();
                var query = queryable.Select(c => new LeaveApprovalAuthorizationDto
                {
                    Id = c.Id,
                    Number = c.Number,
                    Date = c.Date,
                    ValideFromDate = c.ValideFromDate,
                    ValideToDate = c.ValideToDate,
                    AuthorizerId = c.AuthorizerId,
                    AuthorizedPersonId = c.AuthorizedPersonId,
                    Attachments = c.Attachments,
                    Content = c.Content,
                    Status = c.Status,
                    AuthorizerName = c.Authorizer_.Surname,
                    AuthorizedPersonName = c.AuthorizedPerson_.Surname
                }).ToList();
                foreach (var item in query)
                {
                    if (item.Status == 3)
                    {
                        continue; // Nếu status = 3 thì bỏ qua không làm gì
                    }

                    int newStatus = item.Status; // Giữ giá trị ban đầu để so sánh

                    if (item.ValideFromDate.Date <= now.Date && now.Date <= item.ValideToDate.Date && item.Status != 1)
                    {
                        newStatus = 1;
                    }
                    else if (now.Date < item.ValideFromDate.Date && item.Status != 0)
                    {
                        newStatus = 0;
                    }
                    else if (now.Date > item.ValideToDate.Date && item.Status != 2)
                    {
                        newStatus = 2;
                    }

                    // Nếu có thay đổi trạng thái thì cập nhật vào database
                    if (newStatus != item.Status)
                    {
                        item.Status = newStatus;

                        var entity = await _leaveApprovalAuthorizationRepository.GetAsync(item.Id);
                        entity.Status = newStatus;
                        await _leaveApprovalAuthorizationRepository.UpdateAsync(entity);
                    }
                }

                var totalCount = query.AsQueryable().Count();
                var pagedDepartment = query.AsQueryable().OrderByDescending(x => x.ValideFromDate).PageBy(input).ToList();

                var result = ObjectMapper.Map<List<LeaveApprovalAuthorizationDto>>(pagedDepartment);

                return new PagedResultDto<LeaveApprovalAuthorizationDto>(totalCount, result);
            }
            catch (Exception ex)
            {
                throw new UserFriendlyException(ex.Message);
            }
        }


        public async Task<LeaveApprovalAuthorizationDto> GetById(long id)
        {
            try
            {
                var leaveApprovalAuthorization = await _leaveApprovalAuthorizationRepository.GetAll().Where(x => x.Id == id)
                    .Select(c => new LeaveApprovalAuthorizationDto
                    {
                        Id = c.Id,
                        Number = c.Number,
                        Date = c.Date,
                        ValideFromDate = c.ValideFromDate,
                        ValideToDate = c.ValideToDate,
                        AuthorizerId = c.AuthorizerId,
                        AuthorizedPersonId = c.AuthorizedPersonId,
                        Attachments = c.Attachments,
                        Content = c.Content,
                        IsActive = c.IsActive,
                        Status = c.Status
                    }).FirstOrDefaultAsync();

                return ObjectMapper.Map<LeaveApprovalAuthorizationDto>(leaveApprovalAuthorization);
            }
            catch (Exception ex)
            {
                throw new UserFriendlyException(ex.Message);
            }
        }
    }
}