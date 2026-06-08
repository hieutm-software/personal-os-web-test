using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Linq.Dynamic.Core;
using System.Numerics;
using System.Text;
using System.Threading.Tasks;
using Abp.Application.Services.Dto;
using Abp.Authorization;
using Abp.Authorization.Users;
using Abp.Domain.Repositories;
using Abp.Extensions;
using Abp.Linq.Extensions;
using Abp.Notifications;
using Abp.Runtime.Session;
using Abp.UI;
using Abp.Zero.EntityFrameworkCore;
//using DevExpress.XtraExport.Xls;
using ERP.Authorization;
using ERP.Authorization.Roles;
using ERP.Authorization.Users;
using ERP.Business.LeaveApplication.Dto;
using ERP.Business.PushNotification;
using ERP.Business.PushNotification.Dto;
using ERP.Business.RabbitMQ;
using ERP.Configuration;
using ERP.Models.Business;
using ERP.Models.Category;
using ERP.Models.Category;
using ERP.Net.Emailing;
using ERP.Notifications;
using ERP.Shared.Dto;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Newtonsoft.Json;
using RabbitMQ.Client;
using static DevExpress.Xpo.Helpers.AssociatedCollectionCriteriaHelper;

namespace ERP.Business.LeaveApplication
{
    [AbpAuthorize(AppPermissions.Pages_LeaveRegistration_LeaveApplication)]
    public class LeaveApplicationAppService : ERPAppServiceBase, ILeaveApplicationAppService
    {
        private readonly IRepository<
            Models.Business.LeaveApplication,
            long
        > _leaveApplicationRepository;
        private readonly IRepository<
            Models.Category.LeaveApplicationType,
            long
        > _leaveApplicationTypeRepository;
        private readonly IRepository<User, long> _userRepository;

        //private readonly IRepository<Models.Category.LeaveApplicationType, long> _leaveApplicationTypeRepository;
        private readonly IRepository<Group, long> _groupRepository;
        private readonly IRepository<Models.Category.SendEmail, long> _sendMailRepository;
        private readonly IRepository<Models.Category.EmailTemplate, long> _emailTemplateRepository;
        private readonly IRepository<Models.Admin.Parameter, long> _parameterRepository;
        private readonly IEmailTemplateProvider _emailTemplateProvider;
        private readonly EmployeeAnnualLeaveAppService _employeeAnnualLeaveAppService;
        private readonly EmployeeInfoAppService _employeeInfoAppService;
        private readonly IRepository<UserRole, long> _userRoleRepository;
        private readonly IRepository<Role> _roleRepository;
        private readonly IAppNotifier _appNotifier;
        private readonly PushNotificationAppService _pushNotificationApp;
        private readonly IRepository<Models.Business.LichPhanCong, long> _lichPhanCongRepository;
        private readonly IRepository<SendNotification, long> _sendNotificationApplicationRepository;
        private readonly IRepository<
            Models.Category.LeaveApplicationReason,
            long
        > _leaveApplicationReasonRepository;
        private readonly IRepository<Models.Category.ApprovalRole, long> _approvalRoleRepository;
        private readonly IRepository<
            Models.Business.LeaveApplicationLog,
            long
        > _leaveApplicationLogRepository;

        private readonly IHostingEnvironment _env;
        private readonly IConfigurationRoot _appConfiguration;
        private readonly IRepository<Models.Category.ListOfValue, long> _listOfValueRepository;
        private readonly IRepository<
            Models.Business.LuuTruChamCong,
            long
        > _luuTruChamCongRepository;
        private readonly IRepository<
            Models.Category.TimekeepingSymbol,
            long
        > _timekeepingSymbolRepository;

        private readonly IRepository<Department, long> _departmentRepository;
        private readonly UserManager _userManager;
        private readonly IRepository<
            LeaveApprovalAuthorization,
            long
        > _leaveApprovalAuthorizationRepository;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly IRepository<Models.Business.TypeApproval, long> _typeApprovalRepository;
        private readonly IRepository<
            Models.Business.StatusApproval,
            long
        > _statusApprovalRepository;
        private readonly IRepository<Models.Business.UserApproval, long> _userApprovalRepository;
        private readonly IRepository<Models.Business.EmployeeInfo, long> _employeeRepository;

        public LeaveApplicationAppService(
            IRepository<Models.Business.LeaveApplication, long> leaveApplicationRepository,
            IRepository<Models.Category.LeaveApplicationType, long> leaveApplicationTypeRepository,
            IRepository<User, long> userRepository,
            IRepository<Group, long> groupRepository,
            IRepository<SendEmail, long> sendMailRepository,
            IRepository<EmailTemplate, long> emailTemplateRepository,
            IEmailTemplateProvider emailTemplateProvider,
            IRepository<Models.Admin.Parameter, long> parameterRepository,
            EmployeeAnnualLeaveAppService employeeAnnualLeaveAppService,
            EmployeeInfoAppService employeeInfoAppService,
            IRepository<UserRole, long> userRoleRepository,
            IRepository<Role> roleRepository,
            IAppNotifier appNotifier,
            PushNotificationAppService pushNotificationApp,
            IRepository<Models.Business.LichPhanCong, long> lichPhanCongRepository,
            IRepository<SendNotification, long> sendNotificationApplicationRepository,
            IRepository<
                Models.Category.LeaveApplicationReason,
                long
            > leaveApplicationReasonRepository,
            IHostingEnvironment env,
            IRepository<Models.Category.ListOfValue, long> listOfValueRepository,
            IRepository<Models.Category.ApprovalRole, long> approvalRoleRepository,
            IRepository<Models.Business.LuuTruChamCong, long> luuTruChamCongRepository,
            IRepository<Models.Category.TimekeepingSymbol, long> timekeepingSymbolRepository,
            IRepository<Department, long> departmentRepository,
            UserManager userManager,
            IRepository<LeaveApprovalAuthorization, long> leaveApprovalAuthorizationRepository,
            IRepository<Models.Business.LeaveApplicationLog, long> leaveApplicationLogRepository,
            IHttpContextAccessor httpContextAccessor, // Inject IHttpContextAccessor
            IRepository<Models.Business.TypeApproval, long> typeApprovalRepository,
            IRepository<Models.Business.StatusApproval, long> statusApprovalRepository,
            IRepository<Models.Business.UserApproval, long> userApprovalRepository,
            IRepository<Models.Business.EmployeeInfo, long> employeeRepository
        )
        {
            _leaveApplicationRepository = leaveApplicationRepository;
            _leaveApplicationTypeRepository = leaveApplicationTypeRepository;
            _userRepository = userRepository;
            _groupRepository = groupRepository;
            _sendMailRepository = sendMailRepository;
            _emailTemplateRepository = emailTemplateRepository;
            _parameterRepository = parameterRepository;
            _emailTemplateProvider = emailTemplateProvider;
            _employeeAnnualLeaveAppService = employeeAnnualLeaveAppService;
            _employeeInfoAppService = employeeInfoAppService;
            _userRoleRepository = userRoleRepository;
            _roleRepository = roleRepository;
            _appNotifier = appNotifier;
            _pushNotificationApp = pushNotificationApp;
            _lichPhanCongRepository = lichPhanCongRepository;
            _sendNotificationApplicationRepository = sendNotificationApplicationRepository;
            _leaveApplicationReasonRepository = leaveApplicationReasonRepository;
            _env = env;
            _appConfiguration = env.GetAppConfiguration();
            _listOfValueRepository = listOfValueRepository;
            _approvalRoleRepository = approvalRoleRepository;
            _luuTruChamCongRepository = luuTruChamCongRepository;
            _timekeepingSymbolRepository = timekeepingSymbolRepository;
            _departmentRepository = departmentRepository;
            _userManager = userManager;
            _leaveApprovalAuthorizationRepository = leaveApprovalAuthorizationRepository;
            _httpContextAccessor = httpContextAccessor;
            _leaveApplicationLogRepository = leaveApplicationLogRepository;
            _typeApprovalRepository = typeApprovalRepository;
            _statusApprovalRepository = statusApprovalRepository;
            _userApprovalRepository = userApprovalRepository;
            _employeeRepository = employeeRepository;
        }

        [AbpAuthorize(AppPermissions.Pages_LeaveRegistration_LeaveApplication_Create)]
        public async Task Create(LeaveApplicationDto input)
        {
            try
            {
                await ValidateForCreateOrUpdate(input);
                await CheckBackDate(input);

                input.TenantId = AbpSession.GetTenantId();
                input.IsActive = true;
                input.IsDeleted = false;

                var statusApprovalNew = await _statusApprovalRepository.FirstOrDefaultAsync(x =>
                    x.Step == input.Status && x.TypeApproval == input.TypeApprovalId
                );
                if (statusApprovalNew != null)
                {
                    input.CodeStatus = statusApprovalNew.Code;
                }

                //input.IsHalfDayLeave = false;

                var entity = ObjectMapper.Map<Models.Business.LeaveApplication>(input);

                await _leaveApplicationRepository.InsertAsync(entity);
                await CurrentUnitOfWork.SaveChangesAsync();

                if (input.SendMail)
                {
                    // Send mail to Relate people
                    var emailAddress = await GetUserEmailRelativeLeaveApplication(entity.Id);
                    await SendMailToRelativePeople(
                        emailAddress,
                        entity.Id,
                        entity.ApplicationTypeId,
                        "REGISTER-LEAVE-APPLICATION"
                    );
                    // Send Notification
                    var user = await _userRepository.FirstOrDefaultAsync(input.CensorId.Value);
                    SendNotification sendNotify = new SendNotification();
                    NotificationDto rs = new NotificationDto();
                    if (user != null)
                    {
                        PushNotificationCreate data = new PushNotificationCreate();
                        data.userId = entity.CensorId.Value;
                        data.CreatorUserId = entity.SubscriberId.Value;
                        data.title = "Đơn xin nghỉ";
                        data.body = "Bạn đang có đơn nghỉ phép cần duyệt";

                        data.TypeId = entity.Id;
                        data.Color = 1;
                        //sendNotify = await _pushNotificationApp.PushNotifcation(data);
                        if (sendNotify.Id != null && sendNotify.Id != 0)
                        {
                            rs.Id = sendNotify.Id;
                            rs.Title = sendNotify.Title;
                            rs.Content = sendNotify.Content;
                            rs.IsRead = sendNotify.IsRead;
                            rs.Type = sendNotify.Type;
                            rs.TypeId = sendNotify.TypeId;
                            rs.Color = sendNotify.Color;
                            rs.CreationTime = sendNotify.CreationTime;
                            rs.LeaveType = entity.LeaveApplicationType_.Title;
                            rs.NameSender = entity.Subscriber_.Surname;
                            rs.UserIdSender = entity.SubscriberId.Value;
                            rs.NameReceiver = entity.Censor_.Surname;
                            rs.UserIdReceiver = entity.CensorId.Value;
                            rs.NameSubcriber = entity.Subscriber_.Surname;
                        }
                    }
                }
                //return rs;
            }
            catch (Exception ex)
            {
                throw new UserFriendlyException(ex.Message);
            }
        }

        //[AbpAuthorize(AppPermissions.Pages_LeaveRegistration_LeaveApplication_Create)]
        public async Task<NotificationDto> CreateHalfDayOff(LeaveApplicationDto input)
        {
            try
            {
                await ValidateForCreateOrUpdate(input);
                await CheckBackDate(input);

                input.TenantId = AbpSession.GetTenantId();
                input.IsActive = true;
                input.IsDeleted = false;
                input.IsHalfDayLeave = true;
                //input.Status = 5;

                var entity = ObjectMapper.Map<Models.Business.LeaveApplication>(input);
                await _leaveApplicationRepository.InsertAsync(entity);
                await CurrentUnitOfWork.SaveChangesAsync();
                // Send mail to Relate people
                var emailAddress = await GetUserEmailRelativeLeaveApplication(entity.Id);
                await SendMailToRelativePeople(
                    emailAddress,
                    entity.Id,
                    entity.ApplicationTypeId,
                    "REGISTER-LEAVE-APPLICATION"
                );
                //await Subscribe_SentFriendshipRequest(input.TenantId, input.CensorId.Value);
                // Send Notification
                var user = await _userRepository.FirstOrDefaultAsync(input.CensorId.Value);
                SendNotification sendNotify = new SendNotification();
                NotificationDto rs = new NotificationDto();
                if (user != null)
                {
                    PushNotificationCreate data = new PushNotificationCreate();
                    data.userId = entity.CensorId.Value;
                    data.CreatorUserId = entity.SubscriberId.Value;
                    data.title = "Đơn xin nghỉ";
                    data.body = "Bạn đang có đơn nghỉ phép cần duyệt";

                    data.TypeId = entity.Id;
                    data.Color = 1;
                    sendNotify = await _pushNotificationApp.PushNotifcation(data);
                    if (sendNotify.Id != null && sendNotify.Id != 0)
                    {
                        rs.Id = sendNotify.Id;
                        rs.Title = sendNotify.Title;
                        rs.Content = sendNotify.Content;
                        rs.IsRead = sendNotify.IsRead;
                        rs.Type = sendNotify.Type;
                        rs.TypeId = sendNotify.TypeId;
                        rs.Color = sendNotify.Color;
                        rs.CreationTime = sendNotify.CreationTime;
                        rs.LeaveType = entity.LeaveApplicationType_.Title;
                        rs.NameSender = entity.Subscriber_.Surname;
                        rs.UserIdSender = entity.SubscriberId.Value;
                        rs.NameReceiver = entity.Censor_.Surname;
                        rs.UserIdReceiver = entity.CensorId.Value;
                        rs.NameSubcriber = entity.Subscriber_.Surname;
                    }
                }

                return rs;
            }
            catch (Exception ex)
            {
                throw new UserFriendlyException(ex.Message);
            }
        }

        [AbpAuthorize(AppPermissions.Pages_LeaveRegistration_LeaveApplication_Edit)]
        public async Task UpdateHalfDayOff(LeaveApplicationDto input)
        {
            try
            {
                await ValidateForCreateOrUpdate(input);
                await CheckBackDate(input);

                var entity = await _leaveApplicationRepository.FirstOrDefaultAsync(input.Id);

                ObjectMapper.Map(input, entity);
            }
            catch (Exception ex)
            {
                throw new UserFriendlyException(ex.Message);
            }
        }

        public async Task<LeaveApplicationDto> CheckCanEdit(long Id)
        {
            var entity = await _leaveApplicationRepository
                .GetAll()
                .Select(c => new LeaveApplicationDto
                {
                    Status = c.Status,
                    SubscriberId = c.SubscriberId,
                    ApprovedDate = c.ApprovedDate,
                })
                .Where(x => x.SubscriberId == Id && x.Status != 6 && x.Status == 5)
                .OrderByDescending(x => x.ApprovedDate)
                .FirstOrDefaultAsync();

            return ObjectMapper.Map<LeaveApplicationDto>(entity);
        }

        [AbpAuthorize(AppPermissions.Pages_LeaveRegistration_LeaveApplication_Edit)]
        public async Task<NotificationDto> Update(LeaveApplicationDto input)
        {
            try
            {
                await ValidateForCreateOrUpdate(input);
                await CheckBackDate(input);

                var entity = await _leaveApplicationRepository.FirstOrDefaultAsync(input.Id);
                var emailAddress = "";

                var statusApprovalNew = await _statusApprovalRepository.FirstOrDefaultAsync(x =>
                    x.Step == input.Status && x.TypeApproval == input.TypeApprovalId
                );
                if (statusApprovalNew != null)
                {
                    input.CodeStatus = statusApprovalNew.Code;
                }

                ObjectMapper.Map(input, entity);

                if (entity != null)
                {
                    emailAddress = await GetUserEmail((long)entity.CensorId);
                    await SendDeclineOrApproveApplication(
                        emailAddress,
                        entity.Id,
                        entity.ApplicationTypeId,
                        "EDIT-LEAVE-APPLICATION"
                    );
                }

                var user = await _userRepository.FirstOrDefaultAsync(input.CensorId.Value);
                SendNotification sendNotify = new SendNotification();
                NotificationDto rs = new NotificationDto();
                if (user != null)
                {
                    PushNotificationCreate data = new PushNotificationCreate();
                    data.userId = entity.CensorId.Value;
                    data.CreatorUserId = entity.SubscriberId.Value;
                    data.title = "Đơn xin nghỉ";
                    data.body = "Bạn đang có đơn nghỉ phép cần duyệt";

                    data.TypeId = entity.Id;
                    data.Color = 1;
                    //sendNotify = await _pushNotificationApp.PushNotifcation(data);
                    if (sendNotify.Id != null && sendNotify.Id != 0)
                    {
                        rs.Id = sendNotify.Id;
                        rs.Title = sendNotify.Title;
                        rs.Content = sendNotify.Content;
                        rs.IsRead = sendNotify.IsRead;
                        rs.Type = sendNotify.Type;
                        rs.TypeId = sendNotify.TypeId;
                        rs.Color = sendNotify.Color;
                        rs.CreationTime = sendNotify.CreationTime;
                        rs.LeaveType = entity.LeaveApplicationType_.Title;
                        rs.NameSender = entity.Subscriber_.Surname;
                        rs.UserIdSender = entity.SubscriberId.Value;
                        rs.NameReceiver = entity.Censor_.Surname;
                        rs.UserIdReceiver = entity.CensorId.Value;
                        rs.NameSubcriber = entity.Subscriber_.Surname;
                    }
                }

                return rs;
            }
            catch (Exception e)
            {
                throw new UserFriendlyException(e.Message, e.InnerException);
            }
        }

        // NOTE
        [AbpAuthorize(AppPermissions.Pages_LeaveRegistration_LeaveApplication_Delete)]
        public async Task<bool> Delete(long id)
        {
            try
            {
                await _leaveApplicationRepository.DeleteAsync(id);
                var entity = await _leaveApplicationRepository.FirstOrDefaultAsync(id);
                var emailAddress = "";

                if (entity != null)
                {
                    List<Models.Category.SendNotification> listNotifications =
                        await _sendNotificationApplicationRepository
                            .GetAll()
                            .Where(x => x.TypeId == id)
                            .ToListAsync();
                    foreach (var notify in listNotifications)
                    {
                        await _sendNotificationApplicationRepository.DeleteAsync(notify.Id);
                    }

                    emailAddress = await GetUserEmail((long)entity.CensorId);
                    await SendMailToRelativePeople(
                        emailAddress,
                        entity.Id,
                        entity.ApplicationTypeId,
                        "DELETE-LEAVE-APPLICATION"
                    );
                }
            }
            catch (Exception e)
            {
                throw new UserFriendlyException(e.Message, e.InnerException);
            }
            return true;
        }

        [AbpAuthorize(
            AppPermissions.Pages_LeaveRegistration_LeaveApplication_ViewAll,
            AppPermissions.Pages_LeaveRegistration_LeaveApplication_ViewByDepartment,
            AppPermissions.Pages_LeaveRegistration_LeaveApplication_View
        )]
        public async Task<PagedResultDto<LeaveApplicationDto>> GetLeaveApplications(
            FilterLeaveApplicationDto input
        )
        {
            try
            {
                var user = await GetCurrentUserAsync();
                var userId = user.Id;
                DateTime now = DateTime.Now;
                var departmentId = user.DepartmentId ?? 0;

                var listDepartment = (
                    await _approvalRoleRepository
                        .GetAll()
                        .Where(x =>
                            x.CensorId.Contains(userId.ToString()) && !x.IsDeleted && x.IsActive
                        )
                        .Select(x => x.DepartmentId)
                        .ToListAsync()
                )
                    .SelectMany(dept => dept.Split(","))
                    .Select(long.Parse)
                    .Distinct()
                    .ToList();

                var leaveApplicationTypes = await _leaveApplicationTypeRepository
                    .GetAll()
                    .ToDictionaryAsync(x => x.Id, x => new { x.Code, x.Title });

                var queryable = _leaveApplicationRepository.GetAll();

                //if (PermissionChecker.IsGranted(AppPermissions.Pages_LeaveRegistration_LeaveApplication_View))
                //{
                if (
                    PermissionChecker.IsGranted(
                        AppPermissions.Pages_LeaveRegistration_LeaveApplication_ViewAll
                    )
                )
                {
                    queryable = _leaveApplicationRepository.GetAll();
                }
                else if (
                    PermissionChecker.IsGranted(
                        AppPermissions.Pages_LeaveRegistration_LeaveApplication_ViewLeader
                    )
                )
                {
                    queryable = queryable.Where(c =>
                        c.DepartmentId == departmentId
                        || c.DepartmentId == 18
                        || _leaveApplicationLogRepository
                            .GetAll()
                            .Where(x => x.LeaveApplicationId == c.Id && x.CensorId == userId)
                            .Any()
                    );
                }
                else if (
                    PermissionChecker.IsGranted(
                        AppPermissions.Pages_LeaveRegistration_LeaveApplication_ViewByDepartment
                    )
                )
                {
                    queryable = queryable.Where(c =>
                        listDepartment.Contains(c.DepartmentId.Value)
                        || c.DepartmentId == departmentId
                        || _leaveApplicationLogRepository
                            .GetAll()
                            .Where(x => x.LeaveApplicationId == c.Id && x.CensorId == userId)
                            .Any()
                    );
                }
                else
                {
                    queryable = queryable.Where(c =>
                        c.CensorId == userId
                        || c.SubscriberId == userId
                        || _leaveApplicationLogRepository
                            .GetAll()
                            .Where(x => x.LeaveApplicationId == c.Id && x.CensorId == userId)
                            .Any()
                    );
                }
                //}

                if (input.IsMobile == true)
                {
                    queryable = queryable.Where(x => x.SubscriberId != userId);
                }

                var listAuthorizationUserIds = await _leaveApprovalAuthorizationRepository
                    .GetAll()
                    .Where(x =>
                        x.AuthorizedPersonId == userId
                        && !x.IsDeleted
                        && x.Status != 3
                        && x.ValideFromDate.Date <= now.Date
                        && now.Date <= x.ValideToDate.Date
                    )
                    .Select(x => x.AuthorizerId)
                    .ToListAsync();

                if (listAuthorizationUserIds.Any())
                {
                    var queryAuthorization = _leaveApplicationRepository
                        .GetAll()
                        .Where(x =>
                            listAuthorizationUserIds.Contains(x.CensorId)
                            && x.IsComplete != true
                            && x.Status != -1
                        );

                    foreach (var leave in queryAuthorization)
                    {
                        leave.AuthorizedByUserId = userId;
                    }

                    queryable = queryable.Concat(queryAuthorization);
                }

                if (input.LeaveApplicationTypeId.HasValue)
                    queryable = queryable.Where(x =>
                        x.ApplicationTypeId == input.LeaveApplicationTypeId
                    );

                if (input.UserId.HasValue && input.UserId > 0)
                    queryable = queryable.Where(x => x.SubscriberId == input.UserId);

                if (input.FromDate.HasValue)
                    queryable = queryable.Where(x => x.FromDate >= input.FromDate);
                if (input.ToDate.HasValue)
                    queryable = queryable.Where(x => x.ToDate <= input.ToDate);

                if (!string.IsNullOrEmpty(input.DepartmentId))
                {
                    var departmentIds = input
                        .DepartmentId.Split(
                            new[] { ',', ';' },
                            StringSplitOptions.RemoveEmptyEntries
                        )
                        .Select(x => x.Trim())
                        .Where(x => long.TryParse(x, out _))
                        .Select(long.Parse)
                        .Distinct()
                        .ToList();
                    queryable = queryable.Where(c => departmentIds.Contains(c.DepartmentId.Value));
                }

                if (input.Status > 0)
                    queryable = queryable.Where(c => c.CodeStatus == input.Status.ToString());

                var query = queryable
                    .Select(c => new LeaveApplicationDto
                    {
                        Id = c.Id,
                        STT = c.STT,
                        ApplicationTypeId = c.ApplicationTypeId,
                        LeaveApplicationTypeCode = leaveApplicationTypes.ContainsKey(
                            c.ApplicationTypeId.Value
                        )
                            ? leaveApplicationTypes[c.ApplicationTypeId.Value].Code
                            : null,
                        LeaveApplicationTypeTitle = leaveApplicationTypes.ContainsKey(
                            c.ApplicationTypeId.Value
                        )
                            ? leaveApplicationTypes[c.ApplicationTypeId.Value].Title
                            : null,
                        LeaveApplicationReasonId = c.LeaveApplicationReasonId,
                        LeaveApplicationReasonTitle = c.LeaveApplicationReason_.Title,
                        SubscriberId = c.SubscriberId,
                        SubcriberName = c.Subscriber_.Surname,
                        SubcriberEmail = c.Subscriber_.EmailAddress,
                        DepartmentId = c.DepartmentId,
                        DepartmentName = c.Department_.ShortName,
                        FromDate = c.FromDate,
                        ToDate = c.ToDate,
                        ApproverId = c.ApproverId,
                        ApproverName = c.Approver_.Surname,
                        ApproverEmail = c.Approver_.EmailAddress,
                        ApprovedDate = c.ApprovedDate,
                        AuthorizedPersonId = c.AuthorizedPersonId,
                        AuthorizedPersonName = c.Authorized_.Surname,
                        CensorId = c.CensorId,
                        CensorName = c.Censor_.Surname,
                        CensorEmail = c.Censor_.EmailAddress,
                        RelatedPeopleList = c.RelatedPeopleList,
                        RelatedGroupList = c.RelatedGroupList,
                        RegistrationReason = !string.IsNullOrWhiteSpace(c.RegistrationReason)
                            ? c.RegistrationReason
                            : c.LeaveApplicationReason_.Title,
                        ReasonEdit = c.ReasonEdit,
                        ReasonDelete = c.ReasonDelete,
                        NumberOfDayOff = c.NumberOfDayOff,
                        Note = c.Note,
                        Description = c.Description,
                        Status = c.Status,
                        IsHalfDayLeave = c.IsHalfDayLeave,
                        IsWeekendLeave = c.IsWeekendLeave,
                        IsActive = c.IsActive,
                        IsDeleted = c.IsDeleted,
                        LastModificationTime = c.LastModificationTime,
                        CreationTime = c.CreationTime,
                        AnnualLeaveWhenCreate = c.AnnualLeaveWhenCreate,
                        AuthorizedByUserId = c.AuthorizedByUserId,
                        AuthorizedByUserName = c.AuthorizedByUser_.Surname,
                        TypeApprovalId = c.TypeApprovalId,
                        IsComplete = c.IsComplete,
                        CodeStatus = c.CodeStatus,
                    })
                    .GroupBy(x => x.Id)
                    .Select(g => g.First())
                    .WhereIf(
                        !input.Filter.IsNullOrEmpty(),
                        x =>
                            x.NumberOfDayOff.ToString().Equals(input.Filter)
                            || x.SubcriberName.ToUpper().Contains(input.Filter.ToUpper())
                            || x.DepartmentName.ToUpper().Contains(input.Filter.ToUpper())
                    )
                    .ToList();

                var totalCount = query.AsQueryable().Count();

                List<LeaveApplicationDto> lstQuery = new List<LeaveApplicationDto>();
                if (query != null && query.Count > 0)
                {
                    int STT = 1;
                    //int MaxSTT = 999999;
                    foreach (var item in query)
                    {
                        if (
                            (item.IsComplete != true && item.Status != -1)
                            && (
                                item.CensorId == AbpSession.UserId
                                || item.AuthorizedByUserId == AbpSession.UserId
                            )
                            && item.SubscriberId != AbpSession.UserId
                        )
                        {
                            item.STT = STT;
                            STT++;
                            //countOthers++;
                        }
                        else
                        {
                            //countApproved++;
                        }

                        lstQuery.Add(item);
                    }
                }

                //Console.WriteLine("countOthers" + countOthers);
                //Console.WriteLine("countApproved" + countApproved);
                var pagedDepartment = lstQuery
                    .AsQueryable()
                    .OrderBy(input.Sorting)
                    .PageBy(input)
                    .ToList();

                List<LeaveApplicationDto> lstResult = new List<LeaveApplicationDto>();
                if (pagedDepartment != null && pagedDepartment.Count > 0)
                {
                    int STT = 1;
                    //int MaxSTT = 999999;
                    foreach (var item in pagedDepartment)
                    {
                        if (item.TypeApprovalId != null)
                        {
                            var statusApproval =
                                await _statusApprovalRepository.FirstOrDefaultAsync(x =>
                                    x.TypeApproval == item.TypeApprovalId && x.Step == item.Status
                                );
                            if (statusApproval != null)
                            {
                                item.NameStatus = statusApproval.Name;
                            }
                        }

                        if (
                            (item.IsComplete != true && item.Status != -1)
                            && (
                                item.CensorId == AbpSession.UserId
                                || item.AuthorizedByUserId == AbpSession.UserId
                            )
                            && item.SubscriberId != AbpSession.UserId
                        )
                        {
                            item.STT = STT;
                            STT++;
                            //countOthers++;
                        }
                        else
                        {
                            //countApproved++;
                        }

                        lstResult.Add(item);
                    }
                }

                var result = ObjectMapper.Map<List<LeaveApplicationDto>>(lstResult);
                //return Task.FromResult(new PagedResultDto<LeaveApplicationDto>(
                //totalCount, result
                //));

                return new PagedResultDto<LeaveApplicationDto>(totalCount, result);
            }
            catch (Exception ex)
            {
                throw new UserFriendlyException(ex.Message, ex.InnerException);
            }
        }

        public async Task<List<LeaveApplicationDto>> GetLeaveApplitionForReport(
            FilterLeaveAppicationReports input
        )
        {
            try
            {
                List<LeaveApplicationDto> lstResult = new List<LeaveApplicationDto>();
                var queryable = _leaveApplicationRepository.GetAll();

                if (input.LeaveApplicationTypeId.HasValue)
                    queryable = queryable.Where(x =>
                        x.ApplicationTypeId == input.LeaveApplicationTypeId
                    );

                if (input.UserId.HasValue)
                    queryable = queryable.Where(x => x.SubscriberId == input.UserId);

                if (input.FromDate.HasValue)
                    queryable = queryable.Where(x => x.FromDate >= input.FromDate);
                if (input.ToDate.HasValue)
                    queryable = queryable.Where(x => x.ToDate <= input.ToDate);

                if (!string.IsNullOrEmpty(input.DepartmentId))
                {
                    var a = input.DepartmentId.Split(",");
                    queryable = queryable.Where(c => a.Contains(c.DepartmentId.ToString()));
                }

                if (input.Status > 0)
                    queryable = queryable.Where(c => c.Status == input.Status);

                var query = queryable
                    .Select(c => new LeaveApplicationDto
                    {
                        Id = c.Id,
                        STT = c.STT,
                        ApplicationTypeId = c.ApplicationTypeId,
                        LeaveApplicationTypeTitle = c.LeaveApplicationType_.Title,
                        LeaveApplicationReasonId = c.LeaveApplicationReasonId,
                        LeaveApplicationReasonTitle = c.LeaveApplicationReason_.Title,
                        SubscriberId = c.SubscriberId,
                        SubcriberName = c.Subscriber_.Surname,
                        SubcriberEmail = c.Subscriber_.EmailAddress,
                        DepartmentId = c.DepartmentId,
                        DepartmentName = c.Department_.ShortName,
                        FromDate = c.FromDate,
                        ToDate = c.ToDate,
                        ApproverId = c.ApproverId,
                        ApproverName = c.Approver_.Surname,
                        ApproverEmail = c.Approver_.EmailAddress,
                        ApprovedDate = c.ApprovedDate,
                        AuthorizedPersonId = c.AuthorizedPersonId,
                        AuthorizedPersonName = c.Authorized_.Surname,
                        CensorId = c.CensorId,
                        CensorName = c.Censor_.Surname,
                        CensorEmail = c.Censor_.EmailAddress,
                        RelatedPeopleList = c.RelatedPeopleList,
                        RelatedGroupList = c.RelatedGroupList,
                        //RegistrationReason = c.LeaveApplicationReason_.Title != null ? c.LeaveApplicationReason_.Title : c.RegistrationReason,
                        RegistrationReason = !string.IsNullOrWhiteSpace(c.RegistrationReason)
                            ? c.RegistrationReason
                            : c.LeaveApplicationReason_.Title,
                        ReasonEdit = c.ReasonEdit,
                        ReasonDelete = c.ReasonDelete,

                        NumberOfDayOff = c.NumberOfDayOff,
                        //DaysLeft = c.DaysLeft,
                        Note = c.Note,
                        Description = c.Description,
                        Status = c.Status,
                        IsHalfDayLeave = c.IsHalfDayLeave,
                        IsWeekendLeave = c.IsWeekendLeave,
                        IsActive = c.IsActive,
                        IsDeleted = c.IsDeleted,
                        LastModificationTime = c.LastModificationTime,
                        CreationTime = c.CreationTime,
                        AnnualLeaveWhenCreate = c.AnnualLeaveWhenCreate,
                        TypeApprovalId = c.TypeApprovalId,
                        IsComplete = c.IsComplete,
                    })
                    .ToList();
                if (query != null && query.Count > 0)
                {
                    lstResult = ObjectMapper.Map<List<LeaveApplicationDto>>(query);
                }
                return lstResult;
            }
            catch (Exception ex)
            {
                throw new UserFriendlyException(ex.Message, ex.InnerException);
            }
        }

        [AbpAuthorize(
            AppPermissions.Pages_LeaveRegistration_LeaveApplication_ViewAll,
            AppPermissions.Pages_LeaveRegistration_LeaveApplication_View,
            AppPermissions.Pages_LeaveRegistration_LeaveApplication_ViewByDepartment
        )]
        public async Task<LeaveApplicationDto> GetById(long id)
        {
            var entity = await _leaveApplicationRepository
                .GetAll()
                .Select(c => new LeaveApplicationDto
                {
                    Id = c.Id,
                    STT = c.STT,
                    LeaveApplicationTypeTitle = c.LeaveApplicationType_.Title,
                    LeaveApplicationTypeCode = _leaveApplicationTypeRepository
                        .GetAll()
                        .Where(y => y.Id == c.ApplicationTypeId)
                        .Select(x => x.Code)
                        .FirstOrDefault(),
                    ApplicationTypeId = c.ApplicationTypeId,
                    LeaveApplicationReasonId = c.LeaveApplicationReasonId,
                    LeaveApplicationReasonTitle = c.LeaveApplicationReason_.Title,
                    TenantId = c.TenantId,
                    SubscriberId = c.SubscriberId,
                    SubcriberName = c.Subscriber_.Surname,
                    SubcriberEmail = c.Subscriber_.EmailAddress,
                    ApproverId = c.ApproverId,
                    ApproverName = c.Approver_.Surname,
                    ApproverEmail = c.Approver_.EmailAddress,
                    ApprovedDate = c.ApprovedDate,
                    AuthorizedPersonId = c.AuthorizedPersonId,
                    AuthorizedPersonName = c.Authorized_.Surname,
                    CensorId = c.CensorId,
                    CensorName = c.Censor_.Surname,
                    CensorEmail = c.Censor_.EmailAddress,
                    RelatedPeopleList = c.RelatedPeopleList,
                    RelatedGroupList = c.RelatedGroupList,
                    DepartmentId = c.DepartmentId,
                    DepartmentName = c.Department_.ShortName,
                    Description = c.Description,
                    //RegistrationReason = c.LeaveApplicationReason_.Title != null ? c.LeaveApplicationReason_.Title : c.RegistrationReason,
                    RegistrationReason = !string.IsNullOrWhiteSpace(c.RegistrationReason)
                        ? c.RegistrationReason
                        : c.LeaveApplicationReason_.Title,
                    ReasonEdit = c.ReasonEdit,
                    ReasonDelete = c.ReasonDelete,

                    FromDate = c.FromDate,
                    ToDate = c.ToDate,
                    NumberOfDayOff = c.NumberOfDayOff,
                    //DaysLeft = c.DaysLeft,
                    Note = c.Note,
                    Status = c.Status,
                    LastModificationTime = c.LastModificationTime,
                    IsHalfDayLeave = c.IsHalfDayLeave,
                    IsWeekendLeave = c.IsWeekendLeave,
                    IsActive = c.IsActive,
                    IsDeleted = c.IsDeleted,
                    CreationTime = c.CreationTime,
                    AnnualLeaveWhenCreate = c.AnnualLeaveWhenCreate,
                    TypeApprovalId = c.TypeApprovalId,
                    IsComplete = c.IsComplete,
                })
                .Where(x => x.Id == id)
                .FirstOrDefaultAsync();

            return ObjectMapper.Map<LeaveApplicationDto>(entity);
        }

        [AbpAuthorize(
            AppPermissions.Pages_LeaveRegistration_LeaveApplication_ViewAll,
            AppPermissions.Pages_LeaveRegistration_LeaveApplication_View,
            AppPermissions.Pages_LeaveRegistration_LeaveApplication_ViewByDepartment
        )]
        public async Task<LeaveApplicationDto> GetDetailsById(long id)
        {
            //var userRoles = await _userRoleRepository.GetAll()
            //    .Where(userRole => userListDtos.Any(user => user.Id == userRole.UserId))
            //    .Select(userRole => userRole).ToListAsync();
            DateTime now = DateTime.Now;
            var user = await this.GetCurrentUserAsync();
            var userId = user.Id; // this.AbpSession.UserId;

            var dto = new LeaveApplicationDto();
            try
            {
                var lstLeaveApplications = await (
                    from c in _leaveApplicationRepository.GetAll().Include(x => x.LeaveAppLogs)
                    select new LeaveApplicationDto
                    {
                        Id = c.Id,
                        STT = c.STT,
                        LeaveApplicationTypeTitle = c.LeaveApplicationType_.Title,
                        LeaveApplicationTypeCode = _leaveApplicationTypeRepository
                            .GetAll()
                            .Where(y => y.Id == c.ApplicationTypeId)
                            .Select(x => x.Code)
                            .FirstOrDefault(),
                        ApplicationTypeId = c.ApplicationTypeId,
                        LeaveApplicationReasonId = c.LeaveApplicationReasonId,
                        LeaveApplicationReasonTitle = c.LeaveApplicationReason_.Title,
                        TenantId = c.TenantId,
                        SubscriberId = c.SubscriberId,
                        SubcriberName = c.Subscriber_.FullName,
                        SubcriberEmail = c.Subscriber_.EmailAddress,
                        ApproverId = c.ApproverId,
                        ApproverName = c.Approver_.FullName,
                        ApproverEmail = c.Approver_.EmailAddress,
                        ApprovedDate = c.ApprovedDate,
                        DepartmentId = c.DepartmentId,
                        DepartmentName = c.Department_.ShortName,
                        AuthorizedPersonId = c.AuthorizedPersonId,
                        AuthorizedPersonName = c.Authorized_.Surname,
                        CensorId = c.CensorId,
                        CensorName = c.Censor_.Surname,
                        CensorEmail = c.Censor_.EmailAddress,
                        RelatedPeopleList = c.RelatedPeopleList,
                        RelatedGroupList = c.RelatedGroupList,
                        Description = c.Description,
                        //RegistrationReason = c.LeaveApplicationReason_.Title != null ? c.LeaveApplicationReason_.Title : c.RegistrationReason,
                        RegistrationReason = !string.IsNullOrWhiteSpace(c.RegistrationReason)
                            ? c.RegistrationReason
                            : c.LeaveApplicationReason_.Title,
                        ReasonEdit = c.ReasonEdit,
                        ReasonDelete = c.ReasonDelete,

                        FromDate = c.FromDate,
                        ToDate = c.ToDate,
                        NumberOfDayOff = c.NumberOfDayOff,
                        AnnualLeaveWhenCreate = c.AnnualLeaveWhenCreate,
                        //DaysLeft = c.DaysLeft,
                        Note = c.Note,
                        IsHalfDayLeave = c.IsHalfDayLeave,
                        IsWeekendLeave = c.IsWeekendLeave,
                        IsActive = c.IsActive,
                        IsDeleted = c.IsDeleted,
                        Status = c.Status,
                        LastModificationTime = c.LastModificationTime,
                        CreationTime = c.CreationTime,

                        AuthorizedByUserId = c.AuthorizedByUserId,
                        AuthorizedByUserName = c.AuthorizedByUser_.Surname,
                        TypeApprovalId = c.TypeApprovalId,
                        IsComplete = c.IsComplete,

                        ListRole = _userRoleRepository
                            .GetAll()
                            .Where(x => x.UserId == c.SubscriberId)
                            .Join(
                                _roleRepository.GetAll(),
                                ur => ur.RoleId,
                                r => r.Id,
                                (ur, r) => r.RoleCode
                            )
                            .ToList(),
                        LeaveAppLogs = c
                            .LeaveAppLogs.Select(x => new LeaveApplicationLogDto
                            {
                                Id = x.Id,
                                ApprovedDate = x.ApprovedDate,
                                ApproverId = x.ApproverId,
                                ApproverName = x.Approver_.Surname,
                                Status = x.Status,
                                CreationTime = x.CreationTime,
                                FromDate = x.FromDate,
                                ToDate = x.ToDate,
                                LastModificationTime = x.LastModificationTime,
                                LeaveApplicationId = x.LeaveApplication_.Id,
                                Note = x.Note,
                            })
                            .ToList(),
                    }
                )
                    .Where(x => x.Id == id)
                    .FirstOrDefaultAsync();

                try
                {
                    if (lstLeaveApplications != null)
                    {
                        //var listAuthorizationUserIds = await _leaveApprovalAuthorizationRepository.GetAll()
                        //    .Where(x => x.AuthorizedPersonId == userId && x.AuthorizerId == lstLeaveApplications.CensorId && !x.IsDeleted && x.Status != 3
                        //        && x.ValideFromDate.Date <= now.Date && now.Date <= x.ValideToDate.Date)
                        //    .FirstOrDefaultAsync();
                        //if(listAuthorizationUserIds != null)
                        //{
                        //    var authorizerUser = await _userManager.FindByIdAsync(lstLeaveApplications.CensorId.ToString());
                        //    if (authorizerUser != null)
                        //    {
                        //        // Lưu trữ quyền hiện tại của người dùng
                        //        var currentUser = await _userManager.FindByIdAsync(userId.ToString());
                        //        if (currentUser != null)
                        //        {
                        //            var currentRoles = await _userManager.GetRolesAsync(currentUser);
                        //            var currentPermissions = await _userManager.GetGrantedPermissionsAsync(currentUser);

                        //            // Gán quyền mới từ Censor
                        //            var roles = await _userManager.GetRolesAsync(authorizerUser);
                        //            var permissions = await _userManager.GetGrantedPermissionsAsync(authorizerUser);

                        //            await _userManager.AddToRolesAsync(currentUser, roles.ToArray());
                        //            await _userManager.SetGrantedPermissionsAsync(currentUser, permissions);

                        //            // Lưu trữ quyền ban đầu để khôi phục sau này
                        //            var httpContext = _httpContextAccessor.HttpContext;
                        //            if (httpContext != null)
                        //            {
                        //                httpContext.Items["OriginalRoles"] = currentRoles;
                        //                httpContext.Items["OriginalPermissions"] = currentPermissions;
                        //            }
                        //        }
                        //    }
                        //}

                        List<LeaveApplicationLogDto> lstResult = new List<LeaveApplicationLogDto>();

                        foreach (var item in lstLeaveApplications.LeaveAppLogs)
                        {
                            if (lstLeaveApplications.TypeApprovalId != null)
                            {
                                var typeApproval =
                                    await _typeApprovalRepository.FirstOrDefaultAsync(
                                        (long)lstLeaveApplications.TypeApprovalId
                                    );
                                if (typeApproval != null)
                                {
                                    var statusApproval =
                                        await _statusApprovalRepository.FirstOrDefaultAsync(x =>
                                            x.TypeApproval == typeApproval.Id
                                            && x.Step == item.Status
                                        );
                                    if (statusApproval != null)
                                    {
                                        item.NameStatus = statusApproval.Name;
                                    }
                                }
                            }
                            lstResult.Add(item);
                        }

                        lstLeaveApplications.LeaveAppLogs = lstResult;

                        dto = ObjectMapper.Map<LeaveApplicationDto>(lstLeaveApplications);
                    }
                }
                catch (Exception e)
                {
                    //dto = new DocumentDto();
                    Console.WriteLine("LeaveApplication ID: " + id);
                    Console.WriteLine("Exception: " + e.Message);
                }
            }
            catch (Exception ex)
            {
                throw new UserFriendlyException(ex.Message, ex.InnerException);
            }

            return dto;
        }

        [AbpAuthorize(AppPermissions.Pages_LeaveRegistration_LeaveApplication_Edit)]
        public async Task<NotificationDto> UpdateLeaveApplicationStatus(
            UpdateStatusLeaveApplicationDto input
        )
        {
            try
            {
                var emailAddress = "";
                var entity = await _leaveApplicationRepository.FirstOrDefaultAsync(input.Id);
                if (entity == null)
                {
                    throw new UserFriendlyException("Đơn nghỉ phép không tồn tại.");
                }
                else
                {
                    var currentDate = DateTime.Now;
                    if (input.Status == 5)
                    {
                        //if (checkCaKip.Any())
                        //{
                        if (entity.AuthorizedPersonId != null)
                        {
                            Models.Business.LichPhanCong lichChamCong = _lichPhanCongRepository
                                .GetAll()
                                .Where(x =>
                                    x.UserId == input.SubscriberId
                                    && x.WorkDate.Date == entity.FromDate.Value.Date
                                )
                                .FirstOrDefault();
                            if (lichChamCong != null)
                            {
                                lichChamCong.UserId = entity.AuthorizedPersonId;
                                Models.Business.LichPhanCong lichChamCong2 = _lichPhanCongRepository
                                    .GetAll()
                                    .Where(x =>
                                        x.UserId == input.SubscriberId
                                        && x.WorkDate.Date == entity.FromDate.Value.Date
                                    )
                                    .FirstOrDefault();
                                ObjectMapper.Map(lichChamCong, lichChamCong2);
                            }
                        }
                        //}
                        Models.Business.LuuTruChamCong chamCong = _luuTruChamCongRepository
                            .GetAll()
                            .Where(x =>
                                x.UserId == input.SubscriberId
                                && x.GioVao.Date == entity.FromDate.Value.Date
                            )
                            .FirstOrDefault();
                        if (chamCong != null)
                        {
                            var kyHieuChamCong = (
                                from t in _timekeepingSymbolRepository.GetAll()
                                join l in _leaveApplicationTypeRepository.GetAll()
                                    on t.MaKyHieuChamCong equals l.Code
                                where l.Id == entity.ApplicationTypeId
                                select t
                            ).FirstOrDefault();
                            if (kyHieuChamCong.Id != null && kyHieuChamCong.Id >= 0)
                            {
                                var tempObj = chamCong;
                                tempObj.TrangThaiCuoi = kyHieuChamCong.Id;
                                ObjectMapper.Map(tempObj, chamCong);
                            }
                        }
                    }
                    if (input.Status != 6)
                    {
                        if (entity.Status == 5 && input.Status != 1)
                        {
                            throw new UserFriendlyException("Đơn nghỉ phép đã được phê duyệt!");
                        }
                        else
                        {
                            var leaveType =
                                await _leaveApplicationTypeRepository.FirstOrDefaultAsync(
                                    long.Parse(entity.ApplicationTypeId.ToString())
                                );

                            if (leaveType.Code == "P" || leaveType.Code == "P/2")
                            {
                                emailAddress = await GetUserEmail((long)entity.SubscriberId);
                                EmployeeInfoDto EmployeeInfo =
                                    await _employeeInfoAppService.GetBySubscriberEmail(
                                        emailAddress
                                    );
                                EmployeeAnnualLeaveDto employeeAnnualLeave =
                                    await _employeeAnnualLeaveAppService.GetByeEmployeeId(
                                        long.Parse(EmployeeInfo.EmployeeId.ToString())
                                    );
                                if (entity.NumberOfDayOff > employeeAnnualLeave.DaysLeft)
                                {
                                    throw new UserFriendlyException(
                                        "Số ngày NLĐ đăng ký xin nghỉ vượt quá số phép còn lại!"
                                    );
                                }
                            }
                        }
                    }
                    List<Models.Category.SendNotification> listNotifications =
                        await _sendNotificationApplicationRepository
                            .GetAll()
                            .Where(x => x.TypeId == entity.Id)
                            .ToListAsync();
                    foreach (var notify in listNotifications)
                    {
                        notify.IsRead = true;
                        Models.Category.SendNotification notification =
                            await _sendNotificationApplicationRepository
                                .GetAll()
                                .FirstOrDefaultAsync();
                        ObjectMapper.Map(notify, notification);
                    }

                    ObjectMapper.Map(input, entity);

                    PushNotificationCreate data = new PushNotificationCreate();
                    if (input.Status == 5 || input.Status == 6) // 5: Trang thai phe duyet, 6: Trang thai tu choi
                    {
                        if (input.Status == 6)
                        {
                            emailAddress = await GetUserEmailAfterApprove(input.Id);
                            await SendDeclineOrApproveApplication(
                                emailAddress,
                                entity.Id,
                                entity.ApplicationTypeId,
                                "RESPONSE-LEAVE-APPLICATION"
                            );
                        }
                        emailAddress = await GetUserEmail((long)entity.SubscriberId);
                        await SendDeclineOrApproveApplication(
                            emailAddress,
                            entity.Id,
                            entity.ApplicationTypeId,
                            "RESPONSE-LEAVE-APPLICATION"
                        );

                        /// Start send notification
                        data.userId = entity.SubscriberId ?? -1;
                        data.CreatorUserId = entity.CensorId ?? -1;
                        data.title = "Phản hồi đơn xin nghỉ";
                        data.TypeId = entity.Id;
                        if (input.Status == 5)
                        {
                            data.Color = 1;
                            data.body =
                                "Đơn nghỉ phép từ ngày "
                                + entity.FromDate?.ToString("dd/MM/yyyy")
                                + " đến "
                                + entity.ToDate?.ToString("dd/MM/yyyy")
                                + " đã được duyệt bởi";
                        }
                        if (input.Status == 6)
                        {
                            data.Color = 2;
                            data.body =
                                "Đơn nghỉ phép từ ngày "
                                + entity.FromDate?.ToString("dd/MM/yyyy")
                                + " đến "
                                + entity.ToDate?.ToString("dd/MM/yyyy")
                                + " đã bị từ chối bởi";
                        }
                    }
                    else if (input.Status != 1)
                    {
                        emailAddress = await GetUserEmail((long)entity.CensorId);
                        await SendMailToRelativePeople(
                            emailAddress,
                            entity.Id,
                            entity.ApplicationTypeId,
                            "REGISTER-LEAVE-APPLICATION"
                        );
                        data.userId = entity.CensorId.Value;
                        data.CreatorUserId = entity.SubscriberId.Value;
                        data.title = "Đơn xin nghỉ";
                        data.TypeId = entity.Id;
                        data.Color = 1;
                        data.body = "Bạn đang có đơn nghỉ phép cần duyệt";
                    }
                    SendNotification sendNotify = new SendNotification();
                    NotificationDto rs = new NotificationDto();
                    //sendNotify = await _pushNotificationApp.PushNotifcation(data);
                    if (sendNotify.Id != null && sendNotify.Id != 0)
                    {
                        rs.Id = sendNotify.Id;
                        rs.Title = sendNotify.Title;
                        rs.Content = sendNotify.Content;
                        rs.IsRead = sendNotify.IsRead;
                        rs.Type = sendNotify.Type;
                        rs.TypeId = sendNotify.TypeId;
                        rs.Color = sendNotify.Color;
                        rs.CreationTime = sendNotify.CreationTime;
                        rs.LeaveType = entity.LeaveApplicationType_.Title;
                        rs.NameSubcriber = entity.Subscriber_.Surname;
                        if (input.Status == 5 || input.Status == 6)
                        {
                            rs.NameSender = entity.Censor_.Surname;
                            rs.UserIdSender = entity.CensorId.Value;
                            rs.NameReceiver = entity.Subscriber_.Surname;
                            rs.UserIdReceiver = entity.SubscriberId.Value;
                            rs.Content = sendNotify.Content + ": " + entity.Approver_.FullName;
                        }
                        else if (input.Status != 1)
                        {
                            rs.NameSender = entity.Subscriber_.Surname;
                            rs.UserIdSender = entity.SubscriberId.Value;
                            rs.NameReceiver = entity.Censor_.Surname;
                            rs.UserIdReceiver = entity.CensorId.Value;
                        }
                    }

                    return rs;
                }
            }
            catch (Exception ex)
            {
                throw new UserFriendlyException(ex.Message, ex.InnerException);
            }
        }

        [AbpAuthorize(AppPermissions.Pages_LeaveRegistration_LeaveApplication_Edit)]
        public async Task<NotificationDto> UpdateLeaveApplicationStatusNew(
            UpdateStatusLeaveApplicationDto input
        )
        {
            try
            {
                var emailAddress = "";
                var entity = await _leaveApplicationRepository.FirstOrDefaultAsync(input.Id);
                if (entity == null)
                {
                    throw new UserFriendlyException("Đơn nghỉ phép không tồn tại.");
                }
                else
                {
                    //if (input.Status <= entity.Status)
                    //{
                    //    throw new UserFriendlyException("Đơn nghỉ phép đã được chuyển đến cấp tiếp theo.");
                    //}

                    var typeApproval = await _typeApprovalRepository.FirstOrDefaultAsync(x =>
                        x.Id == (long)entity.TypeApprovalId && x.IsActive == true
                    );
                    var statusApproval = await _statusApprovalRepository
                        .GetAll()
                        .Where(x => x.TypeApproval == typeApproval.Id)
                        .ToListAsync();
                    var maxStatus = statusApproval.AsQueryable().Max(x => x.Step);
                    if (input.Status == maxStatus)
                    {
                        input.IsComplete = true;
                    }

                    var currentDate = DateTime.Now;
                    if (input.IsComplete == true)
                    {
                        //if (checkCaKip.Any())
                        //{
                        if (entity.AuthorizedPersonId != null)
                        {
                            Models.Business.LichPhanCong lichChamCong = _lichPhanCongRepository
                                .GetAll()
                                .Where(x =>
                                    x.UserId == input.SubscriberId
                                    && x.WorkDate.Date == entity.FromDate.Value.Date
                                )
                                .FirstOrDefault();
                            if (lichChamCong != null)
                            {
                                lichChamCong.UserId = entity.AuthorizedPersonId;
                                Models.Business.LichPhanCong lichChamCong2 = _lichPhanCongRepository
                                    .GetAll()
                                    .Where(x =>
                                        x.UserId == input.SubscriberId
                                        && x.WorkDate.Date == entity.FromDate.Value.Date
                                    )
                                    .FirstOrDefault();
                                ObjectMapper.Map(lichChamCong, lichChamCong2);
                            }
                        }
                        //}
                        Models.Business.LuuTruChamCong chamCong = _luuTruChamCongRepository
                            .GetAll()
                            .Where(x =>
                                x.UserId == input.SubscriberId
                                && x.GioVao.Date == entity.FromDate.Value.Date
                            )
                            .FirstOrDefault();
                        if (chamCong != null)
                        {
                            var kyHieuChamCong = (
                                from t in _timekeepingSymbolRepository.GetAll()
                                join l in _leaveApplicationTypeRepository.GetAll()
                                    on t.MaKyHieuChamCong equals l.Code
                                where l.Id == entity.ApplicationTypeId
                                select t
                            ).FirstOrDefault();
                            if (kyHieuChamCong.Id != null && kyHieuChamCong.Id >= 0)
                            {
                                var tempObj = chamCong;
                                tempObj.TrangThaiCuoi = kyHieuChamCong.Id;
                                ObjectMapper.Map(tempObj, chamCong);
                            }
                        }
                    }
                    if (input.Status != -1)
                    {
                        if (entity.IsComplete == true && input.Status != 1)
                        {
                            throw new UserFriendlyException("Đơn nghỉ phép đã được phê duyệt!");
                        }
                        //else
                        //{
                        //    var leaveType = await _leaveApplicationTypeRepository.FirstOrDefaultAsync(long.Parse(entity.ApplicationTypeId.ToString()));

                        //    if (leaveType.Code == "P" || leaveType.Code == "P/2")
                        //    {
                        //        emailAddress = await GetUserEmail((long)entity.SubscriberId);
                        //        EmployeeInfoDto EmployeeInfo = await _employeeInfoAppService.GetBySubscriberEmail(emailAddress);
                        //        EmployeeAnnualLeaveDto employeeAnnualLeave = await _employeeAnnualLeaveAppService.GetByeEmployeeId(long.Parse(EmployeeInfo.EmployeeId.ToString()));
                        //        if (entity.NumberOfDayOff > employeeAnnualLeave.DaysLeft)
                        //        {
                        //            throw new UserFriendlyException("Số ngày NLĐ đăng ký xin nghỉ vượt quá số phép còn lại!");
                        //        }
                        //    }
                        //}
                    }
                    List<Models.Category.SendNotification> listNotifications =
                        await _sendNotificationApplicationRepository
                            .GetAll()
                            .Where(x => x.TypeId == entity.Id)
                            .ToListAsync();
                    foreach (var notify in listNotifications)
                    {
                        notify.IsRead = true;
                        Models.Category.SendNotification notification =
                            await _sendNotificationApplicationRepository
                                .GetAll()
                                .FirstOrDefaultAsync();
                        ObjectMapper.Map(notify, notification);
                    }

                    var statusApprovalNew = await _statusApprovalRepository.FirstOrDefaultAsync(x =>
                        x.Step == input.Status && x.TypeApproval == entity.TypeApprovalId
                    );
                    if (statusApprovalNew != null)
                    {
                        input.CodeStatus = statusApprovalNew.Code;
                    }

                    ObjectMapper.Map(input, entity);

                    PushNotificationCreate data = new PushNotificationCreate();
                    if (input.IsComplete == true || input.Status == -1) // 5: Trang thai phe duyet, 6: Trang thai tu choi
                    {
                        if (input.Status == -1)
                        {
                            emailAddress = await GetUserEmailAfterDecline(input.Id);
                            await SendDeclineOrApproveApplication(
                                emailAddress,
                                entity.Id,
                                entity.ApplicationTypeId,
                                "RESPONSE-LEAVE-APPLICATION"
                            );
                        }
                        emailAddress = await GetUserEmail((long)entity.SubscriberId);
                        await SendDeclineOrApproveApplication(
                            emailAddress,
                            entity.Id,
                            entity.ApplicationTypeId,
                            "RESPONSE-LEAVE-APPLICATION"
                        );

                        /// Start send notification
                        data.userId = entity.SubscriberId ?? -1;
                        data.CreatorUserId = entity.CensorId ?? -1;
                        data.title = "Phản hồi đơn xin nghỉ";
                        data.TypeId = entity.Id;
                        if (input.IsComplete == true)
                        {
                            data.Color = 1;
                            data.body =
                                "Đơn nghỉ phép từ ngày "
                                + entity.FromDate?.ToString("dd/MM/yyyy")
                                + " đến "
                                + entity.ToDate?.ToString("dd/MM/yyyy")
                                + " đã được duyệt bởi";
                        }
                        if (input.Status == -1)
                        {
                            data.Color = 2;
                            data.body =
                                "Đơn nghỉ phép từ ngày "
                                + entity.FromDate?.ToString("dd/MM/yyyy")
                                + " đến "
                                + entity.ToDate?.ToString("dd/MM/yyyy")
                                + " đã bị từ chối bởi";
                        }
                    }
                    else if (input.Status != 1)
                    {
                        emailAddress = await GetUserEmail((long)entity.CensorId);
                        await SendMailToRelativePeople(
                            emailAddress,
                            entity.Id,
                            entity.ApplicationTypeId,
                            "REGISTER-LEAVE-APPLICATION"
                        );
                        data.userId = entity.CensorId.Value;
                        data.CreatorUserId = entity.SubscriberId.Value;
                        data.title = "Đơn xin nghỉ";
                        data.TypeId = entity.Id;
                        data.Color = 1;
                        data.body = "Bạn đang có đơn nghỉ phép cần duyệt";
                    }
                    SendNotification sendNotify = new SendNotification();
                    NotificationDto rs = new NotificationDto();
                    //sendNotify = await _pushNotificationApp.PushNotifcation(data);
                    if (sendNotify.Id != null && sendNotify.Id != 0)
                    {
                        rs.Id = sendNotify.Id;
                        rs.Title = sendNotify.Title;
                        rs.Content = sendNotify.Content;
                        rs.IsRead = sendNotify.IsRead;
                        rs.Type = sendNotify.Type;
                        rs.TypeId = sendNotify.TypeId;
                        rs.Color = sendNotify.Color;
                        rs.CreationTime = sendNotify.CreationTime;
                        rs.LeaveType = entity.LeaveApplicationType_.Title;
                        rs.NameSubcriber = entity.Subscriber_.Surname;
                        if (input.IsComplete == true || input.Status == -1)
                        {
                            rs.NameSender = entity.Censor_.Surname;
                            rs.UserIdSender = entity.CensorId.Value;
                            rs.NameReceiver = entity.Subscriber_.Surname;
                            rs.UserIdReceiver = entity.SubscriberId.Value;
                            rs.Content = sendNotify.Content + ": " + entity.Approver_.FullName;
                        }
                        else if (input.Status != 1)
                        {
                            rs.NameSender = entity.Subscriber_.Surname;
                            rs.UserIdSender = entity.SubscriberId.Value;
                            rs.NameReceiver = entity.Censor_.Surname;
                            rs.UserIdReceiver = entity.CensorId.Value;
                        }
                    }

                    return rs;
                }
            }
            catch (Exception ex)
            {
                throw new UserFriendlyException(ex.Message, ex.InnerException);
            }
        }

        // TEST
        public async Task UpdateAnnual(UpdateAnnualLeaveApplicationDto input)
        {
            try
            {
                var entity = await _leaveApplicationRepository.FirstOrDefaultAsync(input.Id);

                ObjectMapper.Map(input, entity);
            }
            catch (Exception ex)
            {
                throw new UserFriendlyException(ex.Message, ex.InnerException);
            }
        }

        public async Task UpdateStatus(UpdateStatusWhenEditDto input)
        {
            try
            {
                var entity = await _leaveApplicationRepository.FirstOrDefaultAsync(input.Id);

                ObjectMapper.Map(input, entity);
            }
            catch (Exception ex)
            {
                throw new UserFriendlyException(ex.Message, ex.InnerException);
            }
        }

        // New
        public async Task UpdateReasonDelete(UpdateReasonDeleteDto input)
        {
            try
            {
                var entity = await _leaveApplicationRepository.FirstOrDefaultAsync(input.Id);

                ObjectMapper.Map(input, entity);
            }
            catch (Exception ex)
            {
                throw new UserFriendlyException(ex.Message, ex.InnerException);
            }
        }

        private async Task ReplaceBodyAndSend(
            string emailAddress,
            string subject,
            StringBuilder emailTemplate,
            StringBuilder mailMessage
        )
        {
            emailTemplate.Replace("{EMAIL_BODY}", mailMessage.ToString());

            String[] strList = emailAddress.Split(",");
            if (emailAddress.Length > 0)
            {
                foreach (String s in strList)
                {
                    await _sendMailRepository.InsertAsync(
                        new SendEmail
                        {
                            Email = s,
                            Content = emailTemplate.ToString(),
                            Subject = subject,
                            IsSuccess = false,
                            IsActive = true,
                            IsDeleted = false,
                            CreationTime = DateTime.Now,
                            TenantId = this.AbpSession.TenantId,
                        }
                    );
                    await CurrentUnitOfWork.SaveChangesAsync();
                }

                //IRabbitMQProducer rabbitMQProducer = new RabbitMQProducer(_env);
                //foreach (String s in strList)
                //{
                //    var sendEmail = new SendEmail
                //    {
                //        Email = s,
                //        Content = emailTemplate.ToString(),
                //        Subject = subject,
                //        IsSuccess = false,
                //        IsActive = true,
                //        IsDeleted = false,
                //        CreationTime = DateTime.Now,
                //        TenantId = this.AbpSession.TenantId,
                //    };
                //    rabbitMQProducer.SendMessage(sendEmail);
                //    Logger.Error("[LeaveApplicationAppService] Push SendEmail to RabbitMQ email=" + sendEmail.Email);
                //}
            }
        }

        private async Task SendDeclineOrApproveApplication(
            string emailAddress,
            long leaveApplicationId,
            long? leaveApplicationTypeId,
            string templateName
        )
        {
            try
            {
                var paramsSys = await _parameterRepository
                    .GetAll()
                    .Where(x => x.SYS_PARAM_CODE == "APP_URL")
                    .FirstOrDefaultAsync();
                var appUrl = "";
                var StatusText = "";
                User subcriberName = new User();
                User approverName = new User();
                if (paramsSys != null)
                {
                    appUrl = paramsSys.PARAM_VALUE;
                    if (!appUrl.Contains("http://"))
                    {
                        appUrl = "http://" + appUrl;
                    }
                    //appUrl = HttpUtility.UrlEncode(appUrl);
                    appUrl +=
                        "/app/leave-registration/leave-application/view-details/"
                        + leaveApplicationId;
                }
                var templateEmailOrigin = await _emailTemplateRepository.FirstOrDefaultAsync(x =>
                    x.TemplateName == templateName && x.IsDeleted == false
                );
                if (templateEmailOrigin != null)
                {
                    var templateEmail = new EmailTemplate();
                    templateEmail.TemplateName = templateEmailOrigin.TemplateName;
                    templateEmail.Bcc = templateEmailOrigin.Bcc;
                    templateEmail.Cc = templateEmailOrigin.Cc;
                    templateEmail.EmailSubTitle = templateEmailOrigin.EmailSubTitle;
                    templateEmail.EmailTitle = templateEmailOrigin.EmailTitle;
                    templateEmail.MailSubject = templateEmailOrigin.MailSubject;
                    templateEmail.TemplateContent = templateEmailOrigin.TemplateContent;

                    var leaveApplication = await _leaveApplicationRepository.FirstOrDefaultAsync(
                        leaveApplicationId
                    );
                    subcriberName = await _userRepository.FirstOrDefaultAsync(
                        (long)leaveApplication.SubscriberId
                    );
                    if (subcriberName != null)
                        templateEmail.EmailTitle = templateEmail.EmailTitle.Replace(
                            "{NGUOI_DE_NGHI}",
                            subcriberName.Surname
                        );
                    templateEmail.MailSubject = templateEmail.MailSubject.Replace(
                        "{NGUOI_DE_NGHI}",
                        subcriberName.Surname
                    );

                    var emailTempalte = GetTitleAndSubTitle(
                        null,
                        templateEmail.EmailTitle,
                        templateEmail.EmailSubTitle
                    );
                    var leaveApplicationType =
                        await _leaveApplicationTypeRepository.FirstOrDefaultAsync(
                            (long)leaveApplicationTypeId
                        );
                    var templateContent = templateEmail.TemplateContent.Replace(
                        "{THONG_TIN_DON_NGHI}",
                        "<a href=\"" + appUrl + "\">" + leaveApplicationType.Title + "</a>"
                    );

                    approverName = await _userRepository.FirstOrDefaultAsync(
                        (long)leaveApplication.ApproverId
                    );
                    if (approverName != null)
                        templateContent = templateContent.Replace(
                            "{NGUOI_PHE_DUYET}",
                            approverName.Surname
                        );

                    var Reason = await _leaveApplicationReasonRepository.FirstOrDefaultAsync(
                        leaveApplication.LeaveApplicationReasonId.Value
                    );
                    var RegistrationReason = "";
                    if (Reason.Id != null)
                    {
                        RegistrationReason = Reason.Title;
                    }
                    else
                    {
                        RegistrationReason = leaveApplication.RegistrationReason;
                    }

                    templateContent = templateContent.Replace("{LY_DO_NGHI}", RegistrationReason);
                    templateContent = templateContent.Replace(
                        "{NOI_DUNG_PHE_DUYET}",
                        leaveApplication.Note
                    );
                    templateContent = templateContent.Replace(
                        "{NGUOI_DE_NGHI}",
                        subcriberName.Surname
                    );
                    templateContent = templateContent.Replace(
                        "{HINH_THUC_NGHI}",
                        leaveApplication.LeaveApplicationType_.Title
                    );

                    if (leaveApplication.ReasonEdit != null)
                        templateContent = templateContent.Replace(
                            "{LY_DO_SUA}",
                            leaveApplication.ReasonEdit
                        );

                    if (leaveApplication.CodeStatus == "5")
                        StatusText = "Đã phê duyệt";
                    if (leaveApplication.CodeStatus == "6")
                        StatusText = "Đã từ chối";

                    templateContent = templateContent.Replace("{TRANG_THAI}", StatusText);

                    var mailMessage = new StringBuilder();
                    mailMessage.AppendLine(templateContent);

                    await ReplaceBodyAndSend(
                        emailAddress,
                        templateEmail.MailSubject,
                        emailTempalte,
                        mailMessage
                    );
                }
            }
            catch (Exception ex)
            {
                Logger.Error(ex.Message, ex);
            }
        }

        private async Task SendMailToRelativePeople(
            string emailAddress,
            long leaveApplicationId,
            long? leaveApplicationTypeId,
            string templateName
        )
        {
            try
            {
                var paramsSys = await _parameterRepository
                    .GetAll()
                    .Where(x => x.SYS_PARAM_CODE == "APP_URL")
                    .FirstOrDefaultAsync();
                var appUrl = "";
                var StatusText = "";
                var userName = new User();
                if (paramsSys != null)
                {
                    appUrl = paramsSys.PARAM_VALUE;
                    if (!appUrl.Contains("http://"))
                    {
                        appUrl = "http://" + appUrl;
                    }
                    //appUrl = HttpUtility.UrlEncode(appUrl);
                    appUrl +=
                        "/app/leave-registration/leave-application/view-details/"
                        + leaveApplicationId;
                }
                var templateEmailOrigin = await _emailTemplateRepository.FirstOrDefaultAsync(x =>
                    x.TemplateName == templateName && x.IsDeleted == false
                );
                if (templateEmailOrigin != null)
                {
                    var templateEmail = new EmailTemplate();
                    templateEmail.TemplateName = templateEmailOrigin.TemplateName;
                    templateEmail.Bcc = templateEmailOrigin.Bcc;
                    templateEmail.Cc = templateEmailOrigin.Cc;
                    templateEmail.EmailSubTitle = templateEmailOrigin.EmailSubTitle;
                    templateEmail.EmailTitle = templateEmailOrigin.EmailTitle;
                    templateEmail.MailSubject = templateEmailOrigin.MailSubject;
                    templateEmail.TemplateContent = templateEmailOrigin.TemplateContent;

                    var leaveApplication = await _leaveApplicationRepository
                        .GetAll()
                        .Where(x => x.Id == leaveApplicationId)
                        .FirstOrDefaultAsync();
                    userName = await _userRepository.FirstOrDefaultAsync(
                        (long)leaveApplication.SubscriberId
                    );
                    if (userName != null)
                    {
                        templateEmail.EmailTitle = templateEmail.EmailTitle.Replace(
                            "{NGUOI_DE_NGHI}",
                            leaveApplication.Subscriber_.Surname
                        );
                        templateEmail.MailSubject = templateEmail.MailSubject.Replace(
                            "{NGUOI_DE_NGHI}",
                            leaveApplication.Subscriber_.Surname
                        );
                    }

                    var emailTempalte = GetTitleAndSubTitle(
                        null,
                        templateEmail.EmailTitle,
                        templateEmail.EmailSubTitle
                    );
                    var leaveApplicationType =
                        await _leaveApplicationTypeRepository.FirstOrDefaultAsync(
                            (long)leaveApplicationTypeId
                        );

                    var templateContent = templateEmail.TemplateContent.Replace(
                        "{THONG_TIN_DON_NGHI}",
                        "<a href=\"" + appUrl + "\">" + leaveApplicationType.Title + "</a>"
                    );
                    templateContent = templateContent.Replace("{NGUOI_DE_NGHI}", userName.Surname);
                    templateContent = templateContent.Replace(
                        "{HINH_THUC_NGHI}",
                        leaveApplication.LeaveApplicationType_.Title
                    );

                    var Reason = await _leaveApplicationReasonRepository.FirstOrDefaultAsync(
                        leaveApplication.LeaveApplicationReasonId.Value
                    );
                    var RegistrationReason = "";
                    if (Reason.Id != null)
                    {
                        RegistrationReason = Reason.Title;
                    }
                    else
                    {
                        RegistrationReason = leaveApplication.RegistrationReason;
                    }
                    templateContent = templateContent.Replace("{LY_DO_NGHI}", RegistrationReason);

                    templateContent = templateContent.Replace(
                        "{TU_NGAY}",
                        leaveApplication.FromDate.Value.ToString("dd/MM/yyyy")
                    );
                    templateContent = templateContent.Replace(
                        "{DEN_NGAY}",
                        leaveApplication.ToDate.Value.ToString("dd/MM/yyyy")
                    );

                    if (leaveApplication.ReasonEdit != null)
                        templateContent = templateContent.Replace(
                            "{LY_DO_SUA}",
                            leaveApplication.ReasonEdit
                        );
                    if (leaveApplication.ReasonDelete != null)
                        templateContent = templateContent.Replace(
                            "{LY_DO_HUY}",
                            leaveApplication.ReasonDelete
                        );

                    if (leaveApplication.CodeStatus == "1")
                        StatusText = "Đã đăng ký";
                    if (leaveApplication.CodeStatus == "2")
                        StatusText = "Đã xem xét";
                    if (leaveApplication.CodeStatus == "3")
                        StatusText = "Đã kiểm tra";
                    if (leaveApplication.CodeStatus == "4")
                        StatusText = "Đã thông qua";
                    templateContent = templateContent.Replace("{TRANG_THAI}", StatusText);

                    var mailMessage = new StringBuilder();
                    mailMessage.AppendLine(templateContent);

                    await ReplaceBodyAndSend(
                        emailAddress,
                        templateEmail.MailSubject,
                        emailTempalte,
                        mailMessage
                    );
                }
            }
            catch (Exception ex)
            {
                Logger.Error(ex.Message, ex);
            }
        }

        private StringBuilder GetTitleAndSubTitle(int? tenantId, string title, string subTitle)
        {
            var emailTemplate = new StringBuilder(
                _emailTemplateProvider.GetDefaultTemplate(tenantId)
            );
            emailTemplate.Replace("{EMAIL_TITLE}", title);
            emailTemplate.Replace("{EMAIL_SUB_TITLE}", subTitle);

            return emailTemplate;
        }

        private async Task ValidateForCreateOrUpdate(LeaveApplicationDto input)
        {
            try
            {
                var userCurrent = await _userRepository.FirstOrDefaultAsync(AbpSession.GetUserId());
                if (userCurrent == null)
                {
                    throw new UserFriendlyException("Người dùng không tồn tại");
                }
                else
                {
                    if (input.ApplicationTypeId != null)
                    {
                        var typeLeave = await _leaveApplicationTypeRepository.FirstOrDefaultAsync(
                            (long)input.ApplicationTypeId
                        );
                        if (!typeLeave.Code.Contains("KL"))
                        {
                            var employee = await _employeeRepository.FirstOrDefaultAsync(x =>
                                x.Email == userCurrent.EmailAddress
                            );
                            if (employee != null)
                            {
                                var AnuualByEmployee =
                                    await _employeeAnnualLeaveAppService.GetAnuualByEmployeeId(
                                        AbpSession.GetUserId(),
                                        (long)employee.EmployeeId
                                    );
                                if (AnuualByEmployee != null)
                                {
                                    var leave =
                                        await _leaveApplicationRepository.FirstOrDefaultAsync(
                                            input.Id
                                        );
                                    if (leave != null)
                                    {
                                        if (typeLeave.Code == "P" || typeLeave.Code == "P/2")
                                        {
                                            if (
                                                AnuualByEmployee.DaysLeft
                                                < input.NumberOfDayOff - leave.NumberOfDayOff
                                            )
                                            {
                                                throw new UserFriendlyException(
                                                    "Nghỉ quá số ngày quy định"
                                                );
                                            }
                                        }
                                    }
                                    else
                                    {
                                        if (typeLeave.Code == "P" || typeLeave.Code == "P/2")
                                        {
                                            if (AnuualByEmployee.DaysLeft < input.NumberOfDayOff)
                                            {
                                                throw new UserFriendlyException(
                                                    "Nghỉ quá số ngày quy định"
                                                );
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }

                var exist = await _leaveApplicationRepository
                    .GetAll()
                    .Where(x =>
                        x.SubscriberId == input.SubscriberId
                        && x.IsDeleted == false
                        && x.Status != -1
                        && (
                            (input.FromDate >= x.FromDate && input.FromDate <= x.ToDate)
                            || (input.FromDate >= x.FromDate && input.ToDate <= x.ToDate)
                            || (
                                input.FromDate <= x.FromDate
                                && (input.ToDate >= x.FromDate && input.ToDate <= x.ToDate)
                            )
                            || (
                                input.ToDate >= x.ToDate
                                && (input.FromDate >= x.FromDate && input.FromDate <= x.ToDate)
                            )
                            || (input.FromDate < x.FromDate && input.ToDate > x.ToDate)
                        )
                    )
                    .WhereIf(input.Id != 0, c => c.Id != input.Id)
                    .ToListAsync();
                if (exist.Any())
                {
                    throw new UserFriendlyException(
                        L(
                            "ReviewYourApplicationMaybeItsDateWasDuplicatedWithYourOtherApplications",
                            input.SubcriberName
                        )
                    );
                }

                //(Số phép đc hưởng trong năm / 12) * số tháng hiện tại +3 = số phép đc dùng trong tháng (nếu lẻ thì làm tròn)
                // var emailAddress = "";
                // var currentDate = DateTime.Now;
                // decimal baseAnnual = 0;
                // var SongayDuocUng = 3;
                // emailAddress = await GetUserEmail((long)input.SubscriberId);
                // EmployeeInfoDto EmployeeInfo = await _employeeInfoAppService.GetBySubscriberEmail(emailAddress);
                // EmployeeAnnualLeaveDto employeeAnnualLeave = await _employeeAnnualLeaveAppService.GetByeEmployeeId(long.Parse(EmployeeInfo.EmployeeId.ToString()));
                // decimal PhepNamTruoc = employeeAnnualLeave.AnnualLeaveLastYear != null ? employeeAnnualLeave.AnnualLeaveLastYear : 0;
                // decimal SoPhepNamNay = employeeAnnualLeave.NumberOfAnnualLeave != null ? employeeAnnualLeave.NumberOfAnnualLeave : 0;
                // var leaveApplicationType = await _leaveApplicationTypeRepository.FirstOrDefaultAsync((long)input.ApplicationTypeId);

                // if (employeeAnnualLeave.NumberOfAnnualLeave > 12)
                // {
                //     baseAnnual = (employeeAnnualLeave.NumberOfAnnualLeave / 12) * input.ToDate.Value.Month;
                // }
                // else
                // {
                //     baseAnnual = input.ToDate.Value.Month;
                // }

                // if (leaveApplicationType.Code.Contains("P"))
                // {
                //     if (PhepNamTruoc <= 0)
                //     {
                //         var ListLeaveApplication = await _leaveApplicationRepository.GetAll()
                //                    .Where(x => x.SubscriberId == input.SubscriberId && x.IsDeleted == false && x.Status != 6
                //                             && (x.LeaveApplicationType_.Code.Contains("P"))
                //                             && (x.FromDate.Value.Year == input.FromDate.Value.Year || x.ToDate.Value.Year == input.FromDate.Value.Year))
                //                    .WhereIf(input.Id != 0, c => c.Id != input.Id)
                //                    .ToListAsync();
                //         decimal SumAnnual = 0;
                //         foreach (var Leave in ListLeaveApplication)
                //         {
                //             SumAnnual += Leave.NumberOfDayOff.Value;
                //         }

                //         var SoPhepDuocDung = SongayDuocUng + baseAnnual;
                //         var SoPhepDaDungTrongThang = SumAnnual;
                //         if (SoPhepDuocDung < SoPhepDaDungTrongThang + input.NumberOfDayOff)
                //         {
                //             throw new UserFriendlyException("Số phép được nghỉ trong tháng đã hết");
                //         }
                //     }
                //     else
                //     {
                //         if (input.FromDate.Value.Month <= 3 || input.ToDate.Value.Month <= 3)
                //         {
                //             var ListLeaveApplication = await _leaveApplicationRepository.GetAll()
                //                        .Where(x => x.SubscriberId == input.SubscriberId && x.IsDeleted == false && x.Status != 6
                //                                 && (x.LeaveApplicationType_.Code.Contains("P"))
                //                                 && (x.FromDate.Value.Year == input.FromDate.Value.Year || x.ToDate.Value.Year == input.FromDate.Value.Year)
                //                                 && (x.FromDate.Value.Month <= input.FromDate.Value.Month || x.ToDate.Value.Month <= input.FromDate.Value.Month))
                //                        .WhereIf(input.Id != 0, c => c.Id != input.Id)
                //                        .ToListAsync();
                //             decimal SumAnnual = 0;
                //             foreach (var Leave in ListLeaveApplication)
                //             {
                //                 SumAnnual += Leave.NumberOfDayOff.Value;
                //             }

                //             var SoPhepDuocDung = PhepNamTruoc + SongayDuocUng + baseAnnual;
                //             var SoPhepDaDungTrongThang = SumAnnual;
                //             if (SoPhepDuocDung < SoPhepDaDungTrongThang + input.NumberOfDayOff)
                //             {
                //                 throw new UserFriendlyException("Số phép được nghỉ trong tháng đã hết");
                //             }
                //         }
                //         else
                //         {
                //             var ListLeaveApplication = await _leaveApplicationRepository.GetAll()
                //                        .Where(x => x.SubscriberId == input.SubscriberId && x.IsDeleted == false && x.Status != 6
                //                                 && (x.LeaveApplicationType_.Code.Contains("P"))
                //                                 && (x.FromDate.Value.Year == input.FromDate.Value.Year || x.ToDate.Value.Year == input.FromDate.Value.Year))
                //                        .WhereIf(input.Id != 0, c => c.Id != input.Id)
                //                        .ToListAsync();
                //             decimal SumAnnual = 0;
                //             decimal SoNgayNghiQuiI = 0;
                //             decimal SoNgayNghiSauQuiI = 0;
                //             foreach (var Leave in ListLeaveApplication)
                //             {
                //                 if (Leave.FromDate.Value.Month <= 3 || Leave.ToDate.Value.Month <= 3)
                //                 {
                //                     SoNgayNghiQuiI += Leave.NumberOfDayOff.Value;
                //                 }
                //                 if (Leave.FromDate.Value.Month > 3 || Leave.ToDate.Value.Month > 3)
                //                 {
                //                     SoNgayNghiSauQuiI += Leave.NumberOfDayOff.Value;
                //                 }

                //             }
                //             SumAnnual = (SoNgayNghiQuiI - PhepNamTruoc > 0 ? SoNgayNghiQuiI - PhepNamTruoc : 0) + SoNgayNghiSauQuiI;

                //             var SoPhepDuocDung = SongayDuocUng + baseAnnual;
                //             var SoPhepDaDungTrongThang = SumAnnual;

                //             if (input.FromDate.Value.Month == 12)
                //             {
                //                 if (SoPhepNamNay < SoPhepDaDungTrongThang + input.NumberOfDayOff)
                //                 {
                //                     throw new UserFriendlyException("Số phép được nghỉ trong tháng đã hết");
                //                 }
                //             }
                //             else
                //             {
                //                 if (SoPhepDuocDung < SoPhepDaDungTrongThang + input.NumberOfDayOff)
                //                 {
                //                     throw new UserFriendlyException("Số phép được nghỉ trong tháng đã hết");
                //                 }
                //             }

                //         }
                //     }
                // }
            }
            catch (Exception e)
            {
                throw new UserFriendlyException(e.Message, e.InnerException);
            }
        }

        private async Task CheckBackDate(LeaveApplicationDto input)
        {
            try
            {
                var days = await _listOfValueRepository
                    .GetAll()
                    .Where(y => y.ListName.Contains("NghiPhep"))
                    .Select(x => x.ValueField)
                    .FirstOrDefaultAsync();
                if (string.IsNullOrEmpty(days))
                {
                    days = "1";
                }
                if (int.Parse(days) < 0)
                {
                    days = "1";
                }
                var fromDate = input.FromDate.Value;

                var temData = await _leaveApplicationReasonRepository.FirstOrDefaultAsync(
                    (long)input.LeaveApplicationReasonId
                );

                if (temData == null)
                {
                    throw new UserFriendlyException("Không tìm thấy lý do nghỉ phép");
                }

                var nghiDungHan = temData.NghiDungHan;
                var nghiQuahan = temData.NghiQuahan;

                // Phải đăng ký đơn nghỉ ngay sau khi đi làm lại (không tính T7 CN)
                if (nghiQuahan.Value)
                {
                    var dayAfterToDate = input.ToDate.Value.AddDays(int.Parse(days));
                    var isSat = dayAfterToDate.DayOfWeek == DayOfWeek.Saturday;
                    var isSun = dayAfterToDate.DayOfWeek == DayOfWeek.Sunday;

                    // Ngày sau ToDate của đơn => ngày phải đăng ký. Nếu ngày phải đăng ký là T7 hoặc => ngày phải đăng ký là T2 tuần sau
                    // Ngày tạo mà lớn hơn ngày phải đăng ký
                    if (isSat && input.CreationTime.Value.Date > dayAfterToDate.AddDays(2).Date)
                    {
                        if (!string.IsNullOrWhiteSpace(temData.Description))
                        {
                            throw new UserFriendlyException(temData.Description);
                        }
                        else
                        {
                            throw new UserFriendlyException(
                                "Ngày tạo đơn phải ngay sau khi đi làm lại (Ngày nghỉ cuối cùng + "
                                    + days
                                    + " (Không tính thứ 7,CN))"
                            );
                        }
                    }
                    else if (
                        isSun
                        && input.CreationTime.Value.Date > dayAfterToDate.AddDays(1).Date
                    )
                    {
                        if (!string.IsNullOrWhiteSpace(temData.Description))
                        {
                            throw new UserFriendlyException(temData.Description);
                        }
                        else
                        {
                            throw new UserFriendlyException(
                                "Ngày tạo đơn phải ngay sau khi đi làm lại (Ngày nghỉ cuối cùng + "
                                    + days
                                    + " (Không tính thứ 7,CN))"
                            );
                        }
                    }
                    else if (
                        isSat != true
                        && isSun != true
                        && input.CreationTime.Value.Date > dayAfterToDate.Date
                    )
                    {
                        var nextLeave = await _leaveApplicationRepository
                            .GetAll()
                            .Where(x =>
                                x.SubscriberId == input.SubscriberId
                                && x.FromDate.Value.Date == dayAfterToDate.Date
                                && x.IsDeleted != true
                                && x.Status != 6
                            )
                            .FirstOrDefaultAsync();

                        if (nextLeave != null)
                        {
                            var dayAfterToDate2 = nextLeave.ToDate.Value.AddDays(1);
                            var isSat2 = dayAfterToDate2.DayOfWeek == DayOfWeek.Saturday;
                            var isSun2 = dayAfterToDate2.DayOfWeek == DayOfWeek.Sunday;
                            if (
                                isSat2
                                && input.CreationTime.Value.Date > dayAfterToDate2.AddDays(2).Date
                            )
                            {
                                if (!string.IsNullOrWhiteSpace(temData.Description))
                                {
                                    throw new UserFriendlyException(temData.Description);
                                }
                                else
                                {
                                    throw new UserFriendlyException(
                                        "Ngày tạo đơn phải ngay sau khi đi làm lại (Ngày nghỉ cuối cùng + "
                                            + days
                                            + " (Không tính thứ 7,CN))"
                                    );
                                }
                            }
                            else if (
                                isSun2
                                && input.CreationTime.Value.Date > dayAfterToDate2.AddDays(1).Date
                            )
                            {
                                if (!string.IsNullOrWhiteSpace(temData.Description))
                                {
                                    throw new UserFriendlyException(temData.Description);
                                }
                                else
                                {
                                    throw new UserFriendlyException(
                                        "Ngày tạo đơn phải ngay sau khi đi làm lại (Ngày nghỉ cuối cùng + "
                                            + days
                                            + " (Không tính thứ 7,CN))"
                                    );
                                }
                            }
                            else if (
                                isSat2 != true
                                && isSun2 != true
                                && input.CreationTime.Value.Date > dayAfterToDate2.Date
                            )
                            {
                                if (!string.IsNullOrWhiteSpace(temData.Description))
                                {
                                    throw new UserFriendlyException(temData.Description);
                                }
                                else
                                {
                                    throw new UserFriendlyException(
                                        "Ngày tạo đơn phải ngay sau khi đi làm lại (Ngày nghỉ cuối cùng + "
                                            + days
                                            + " (Không tính thứ 7,CN))"
                                    );
                                }
                            }
                        }
                        else
                        {
                            if (!string.IsNullOrWhiteSpace(temData.Description))
                            {
                                throw new UserFriendlyException(temData.Description);
                            }
                            else
                            {
                                throw new UserFriendlyException(
                                    "Ngày tạo đơn phải ngay sau khi đi làm lại (Ngày nghỉ cuối cùng + "
                                        + days
                                        + " (Không tính thứ 7,CN))"
                                );
                            }
                        }
                    }
                }
                // Phải đăng ký đơn nghỉ theo đúng quy định
                else if (nghiDungHan.Value)
                {
                    if (
                        input.NumberOfDayOff >= 120
                        && input.CreationTime.Value.Date > fromDate.AddDays(-5).Date
                    )
                    {
                        if (!string.IsNullOrWhiteSpace(temData.Description))
                        {
                            throw new UserFriendlyException(temData.Description);
                        }
                        else
                        {
                            throw new UserFriendlyException(
                                "Ngày tạo đơn phải trước ngày nghỉ trước ít nhất 5 ngày!"
                            );
                        }
                    }
                    else if (fromDate.Date <= input.CreationTime.Value.Date)
                    {
                        if (!string.IsNullOrWhiteSpace(temData.Description))
                        {
                            throw new UserFriendlyException(temData.Description);
                        }
                        else
                        {
                            throw new UserFriendlyException(
                                "Ngày tạo đơn phải trước ngày nghỉ trước ít nhất 1 ngày!"
                            );
                        }
                    }
                }
            }
            catch (Exception e)
            {
                throw new UserFriendlyException(e.Message, e.InnerException);
            }
        }

        private async Task<string> GetUserEmailRelativeLeaveApplication(long leaveApplicationId)
        {
            try
            {
                var userLists = "";
                var emailLists = "";

                var query1 = await _leaveApplicationRepository.FirstOrDefaultAsync(
                    leaveApplicationId
                );

                if (query1.AuthorizedPersonId != null)
                    userLists += query1.AuthorizedPersonId + ",";
                if (query1.CensorId != null)
                    userLists += query1.CensorId + ",";

                if (query1.RelatedPeopleList != null && query1.RelatedPeopleList != "")
                    userLists += query1.RelatedPeopleList + ",";

                if (query1.RelatedGroupList != null && query1.RelatedGroupList != "")
                {
                    List<string> uniquesRelatedGroupList = query1
                        .RelatedGroupList.Split(",")
                        .Select(x => x.Trim())
                        .Where(x => !string.IsNullOrWhiteSpace(x))
                        .Distinct()
                        .ToList();
                    var user2 = string.Join(",", uniquesRelatedGroupList);
                    var userRelatedGroupList = user2
                        .Split(",")
                        .Where(x => !String.IsNullOrWhiteSpace(x))
                        .Select(p => (long)Convert.ToDouble(p.Trim()));

                    var query3 = await _groupRepository
                        .GetAll()
                        .Where(x => userRelatedGroupList.Contains(x.Id))
                        .ToListAsync();

                    for (var i = 0; i < query3.Count; i++)
                    {
                        userLists += query3[i].UsersList + ",";
                    }
                }

                List<string> uniques = userLists
                    .Split(",")
                    .Select(x => x.Trim())
                    .Where(x => !string.IsNullOrWhiteSpace(x))
                    .Distinct()
                    .ToList();
                var newStr = string.Join(",", uniques);
                if (newStr != "")
                {
                    var userListAll = newStr
                        .Split(",")
                        .Where(x => !string.IsNullOrWhiteSpace(x))
                        .Select(p => (long)Convert.ToDouble(p.Trim()));

                    var result = await _userRepository
                        .GetAll()
                        .Where(x => userListAll.Contains(x.Id) && x.IsActive == true)
                        .ToListAsync();
                    for (var i = 0; i < result.Count; i++)
                    {
                        emailLists += result[i].EmailAddress;
                        if (i < result.Count - 1)
                        {
                            emailLists += ",";
                        }
                    }
                }
                return emailLists;
            }
            catch (Exception e)
            {
                throw (e);
            }
        }

        private async Task<string> GetUserEmailAfterApprove(long leaveApplicationId)
        {
            try
            {
                var emailLists = "";

                var listUserIds = await _leaveApplicationLogRepository
                    .GetAll()
                    .Where(x => x.LeaveApplicationId == leaveApplicationId)
                    .Select(s => s.CensorId)
                    .ToListAsync();

                if (listUserIds.Any())
                {
                    var result = await _userRepository
                        .GetAll()
                        .Where(x => listUserIds.Contains(x.Id) && x.IsActive == true)
                        .ToListAsync();
                    for (var i = 0; i < result.Count; i++)
                    {
                        emailLists += result[i].EmailAddress;
                        if (i < result.Count - 1)
                        {
                            emailLists += ",";
                        }
                    }
                }
                return emailLists;
            }
            catch (Exception e)
            {
                throw (e);
            }
        }

        private async Task<string> GetUserEmailAfterDecline(long leaveApplicationId)
        {
            try
            {
                var emailLists = "";

                var listUserIds = await _leaveApplicationLogRepository
                    .GetAll()
                    .Where(x => x.LeaveApplicationId == leaveApplicationId)
                    .Select(s => s.ApproverId)
                    .ToListAsync();

                if (listUserIds.Any())
                {
                    var result = await _userRepository
                        .GetAll()
                        .Where(x => listUserIds.Contains(x.Id) && x.IsActive == true)
                        .ToListAsync();
                    for (var i = 0; i < result.Count; i++)
                    {
                        emailLists += result[i].EmailAddress;
                        if (i < result.Count - 1)
                        {
                            emailLists += ",";
                        }
                    }
                }
                return emailLists;
            }
            catch (Exception e)
            {
                throw (e);
            }
        }

        private async Task<string> GetUserEmail(long userId)
        {
            var user = await _userRepository.FirstOrDefaultAsync(userId);

            return user.EmailAddress;
        }

        [AbpAuthorize(
            AppPermissions.Pages_LeaveRegistration_LeaveApplication_ViewAll,
            AppPermissions.Pages_LeaveRegistration_LeaveApplication_ViewByDepartment,
            AppPermissions.Pages_LeaveRegistration_LeaveApplication_View
        )]
        public async Task<PagedResultDto<LeaveApplicationDto>> GetLeaveOtherApplications(
            FilterLeaveApplicationDto input
        )
        {
            try
            {
                var user = await GetCurrentUserAsync();
                var userId = user.Id;
                DateTime now = DateTime.Now;
                var departmentId = user.DepartmentId ?? 0;

                var listDepartment = (
                    await _approvalRoleRepository
                        .GetAll()
                        .Where(x =>
                            x.CensorId.Contains(userId.ToString()) && !x.IsDeleted && x.IsActive
                        )
                        .Select(x => x.DepartmentId)
                        .ToListAsync()
                )
                    .SelectMany(dept => dept.Split(","))
                    .Select(long.Parse)
                    .Distinct()
                    .ToList();

                var leaveApplicationTypes = await _leaveApplicationTypeRepository
                    .GetAll()
                    .ToDictionaryAsync(x => x.Id, x => new { x.Code, x.Title });

                var queryable = _leaveApplicationRepository.GetAll();
                queryable = queryable.Where(x => x.SubscriberId != userId);
                // Lấy dữ liệu theo quyền
                //if (PermissionChecker.IsGranted(AppPermissions.Pages_LeaveRegistration_LeaveApplication_View))
                //{
                if (
                    PermissionChecker.IsGranted(
                        AppPermissions.Pages_LeaveRegistration_LeaveApplication_ViewAll
                    )
                )
                {
                    queryable = _leaveApplicationRepository.GetAll();
                }
                else if (
                    PermissionChecker.IsGranted(
                        AppPermissions.Pages_LeaveRegistration_LeaveApplication_ViewLeader
                    )
                )
                {
                    queryable = queryable.Where(c =>
                        c.DepartmentId == departmentId || c.DepartmentId == 18
                    );
                }
                else if (
                    PermissionChecker.IsGranted(
                        AppPermissions.Pages_LeaveRegistration_LeaveApplication_ViewByDepartment
                    )
                )
                {
                    queryable = queryable.Where(c =>
                        listDepartment.Contains(c.DepartmentId.Value)
                        || c.DepartmentId == departmentId
                    );
                }
                else
                {
                    queryable = queryable.Where(c =>
                        c.CensorId == userId || c.SubscriberId == userId
                    );
                }
                //}

                var listAuthorizationUserIds = await _leaveApprovalAuthorizationRepository
                    .GetAll()
                    .Where(x =>
                        x.AuthorizedPersonId == userId
                        && !x.IsDeleted
                        && x.Status != 3
                        && x.ValideFromDate.Date <= now.Date
                        && now.Date <= x.ValideToDate.Date
                    )
                    .Select(x => x.AuthorizerId)
                    .ToListAsync();

                if (listAuthorizationUserIds.Any())
                {
                    var queryAuthorization = _leaveApplicationRepository
                        .GetAll()
                        .Where(x =>
                            listAuthorizationUserIds.Contains(x.CensorId)
                            && x.Status != 5
                            && x.Status != 6
                        );

                    foreach (var leave in queryAuthorization)
                    {
                        leave.AuthorizedByUserId = userId;
                    }

                    queryable = queryable.Concat(queryAuthorization);
                }

                if (input.LeaveApplicationTypeId.HasValue)
                    queryable = queryable.Where(x =>
                        x.ApplicationTypeId == input.LeaveApplicationTypeId
                    );

                if (input.UserId.HasValue && input.UserId > 0)
                    queryable = queryable.Where(x => x.SubscriberId == input.UserId);

                if (input.FromDate.HasValue)
                    queryable = queryable.Where(x => x.FromDate >= input.FromDate);
                if (input.ToDate.HasValue)
                    queryable = queryable.Where(x => x.ToDate <= input.ToDate);

                if (!string.IsNullOrEmpty(input.DepartmentId))
                {
                    var departmentIds = input.DepartmentId.Split(",").Select(long.Parse).ToList();
                    queryable = queryable.Where(c => departmentIds.Contains(c.DepartmentId.Value));
                }

                if (input.Status > 0)
                    queryable = queryable.Where(c => c.Status == input.Status);

                var query = queryable
                    .Select(c => new LeaveApplicationDto
                    {
                        Id = c.Id,
                        STT = c.STT,
                        ApplicationTypeId = c.ApplicationTypeId,
                        LeaveApplicationTypeCode = leaveApplicationTypes.ContainsKey(
                            c.ApplicationTypeId.Value
                        )
                            ? leaveApplicationTypes[c.ApplicationTypeId.Value].Code
                            : null,
                        LeaveApplicationTypeTitle = leaveApplicationTypes.ContainsKey(
                            c.ApplicationTypeId.Value
                        )
                            ? leaveApplicationTypes[c.ApplicationTypeId.Value].Title
                            : null,
                        LeaveApplicationReasonId = c.LeaveApplicationReasonId,
                        LeaveApplicationReasonTitle = c.LeaveApplicationReason_.Title,
                        SubscriberId = c.SubscriberId,
                        SubcriberName = c.Subscriber_.Surname,
                        SubcriberEmail = c.Subscriber_.EmailAddress,
                        DepartmentId = c.DepartmentId,
                        DepartmentName = c.Department_.ShortName,
                        FromDate = c.FromDate,
                        ToDate = c.ToDate,
                        ApproverId = c.ApproverId,
                        ApproverName = c.Approver_.Surname,
                        ApproverEmail = c.Approver_.EmailAddress,
                        ApprovedDate = c.ApprovedDate,
                        AuthorizedPersonId = c.AuthorizedPersonId,
                        AuthorizedPersonName = c.Authorized_.Surname,
                        CensorId = c.CensorId,
                        CensorName = c.Censor_.Surname,
                        CensorEmail = c.Censor_.EmailAddress,
                        RelatedPeopleList = c.RelatedPeopleList,
                        RelatedGroupList = c.RelatedGroupList,
                        RegistrationReason = !string.IsNullOrWhiteSpace(c.RegistrationReason)
                            ? c.RegistrationReason
                            : c.LeaveApplicationReason_.Title,
                        ReasonEdit = c.ReasonEdit,
                        ReasonDelete = c.ReasonDelete,
                        NumberOfDayOff = c.NumberOfDayOff,
                        Note = c.Note,
                        Description = c.Description,
                        Status = c.Status,
                        IsHalfDayLeave = c.IsHalfDayLeave,
                        IsWeekendLeave = c.IsWeekendLeave,
                        IsActive = c.IsActive,
                        IsDeleted = c.IsDeleted,
                        LastModificationTime = c.LastModificationTime,
                        CreationTime = c.CreationTime,
                        AnnualLeaveWhenCreate = c.AnnualLeaveWhenCreate,
                        AuthorizedByUserId = c.AuthorizedByUserId,
                        AuthorizedByUserName = c.AuthorizedByUser_.Surname,
                        TypeApprovalId = c.TypeApprovalId,
                        IsComplete = c.IsComplete,
                    })
                    .GroupBy(x => x.Id)
                    .Select(g => g.First())
                    .WhereIf(
                        !input.Filter.IsNullOrEmpty(),
                        x =>
                            x.NumberOfDayOff.ToString().Equals(input.Filter)
                            || x.SubcriberName.ToUpper().Contains(input.Filter.ToUpper())
                            || x.DepartmentName.ToUpper().Contains(input.Filter.ToUpper())
                    )
                    .ToList();

                List<LeaveApplicationDto> lstResult = new List<LeaveApplicationDto>();
                if (query != null && query.Count > 0)
                {
                    int STT = 1;
                    //int MaxSTT = 999999;
                    foreach (var item in query)
                    {
                        if (item.TypeApprovalId != null)
                        {
                            var typeApproval = await _typeApprovalRepository.FirstOrDefaultAsync(
                                x => x.Id == (long)item.TypeApprovalId
                            );
                            if (typeApproval != null)
                            {
                                var statusApproval =
                                    await _statusApprovalRepository.FirstOrDefaultAsync(x =>
                                        x.TypeApproval == typeApproval.Id && x.Step == item.Status
                                    );
                                if (statusApproval != null)
                                {
                                    item.NameStatus = statusApproval.Name;
                                }
                            }
                        }

                        if (
                            (item.IsComplete != true && item.Status != -1)
                            && (
                                item.CensorId == AbpSession.UserId
                                || item.AuthorizedByUserId == AbpSession.UserId
                            )
                            && item.SubscriberId != AbpSession.UserId
                        )
                        {
                            item.STT = STT;
                            STT++;
                            //countOthers++;
                        }
                        else
                        {
                            //countApproved++;
                        }

                        lstResult.Add(item);
                    }
                }

                var totalCount = lstResult.AsQueryable().Count();

                //Console.WriteLine("countOthers" + countOthers);
                //Console.WriteLine("countApproved" + countApproved);
                var pagedDepartment = lstResult
                    .AsQueryable()
                    .OrderBy(input.Sorting)
                    .PageBy(input)
                    .ToList();

                var result = ObjectMapper.Map<List<LeaveApplicationDto>>(pagedDepartment);
                //return Task.FromResult(new PagedResultDto<LeaveApplicationDto>(
                //totalCount, result
                //));

                return new PagedResultDto<LeaveApplicationDto>(totalCount, result);
            }
            catch (Exception ex)
            {
                throw new UserFriendlyException(ex.Message, ex.InnerException);
            }
        }

        public async Task<CheckLeaveDto> CheckLeaveRequest(LeaveApplicationDto leave)
        {
            var user = await this.GetCurrentUserAsync();
            var userId = user.Id;
            var departmentId = user.DepartmentId.HasValue ? user.DepartmentId : 0;

            if (leave.AuthorizedByUserId != null)
            {
                if (leave.AuthorizedByUserId == userId)
                {
                    leave.CensorId = userId;
                }
            }
            // Kiểm tra xem xét
            bool canReview =
                leave.Status == AppConsts.DangKy
                && leave.CensorId == userId
                && (
                    // NGHỈ KHÔNG LƯƠNG
                    (
                        leave.LeaveApplicationTypeCode.ToUpper().Contains("KL")
                        && (
                            // Nếu là Trưởng Nhóm
                            (
                                PermissionChecker.IsGranted("Pages.LeaveRegistration.Approvel.TN")
                                && leave.NumberOfDayOff < 5
                            )
                            ||
                            // Nếu là LĐP
                            (
                                PermissionChecker.IsGranted("Pages.LeaveRegistration.Approvel.LDP")
                                && (
                                    (
                                        !PermissionChecker.IsGranted(
                                            "Pages.LeaveRegistration.Approvel.LDPTCHC"
                                        )
                                        && leave.NumberOfDayOff >= 5
                                    )
                                    || leave.ListRole.Contains("TN")
                                    || leave.ListRole.Contains("Thuky")
                                    || leave.ListRole.Contains("TK_TL_TGD")
                                )
                            )
                            ||
                            // Nếu là LPDTCHC
                            (
                                PermissionChecker.IsGranted(
                                    "Pages.LeaveRegistration.Approvel.LDPTCHC"
                                )
                                && (
                                    (
                                        leave.NumberOfDayOff >= 1
                                        && (
                                            leave.ListRole.Contains("LDP")
                                            || leave.ListRole.Contains("TN")
                                            || leave.ListRole.Contains("Thuky")
                                            || leave.ListRole.Contains("TK_TL_TGD")
                                        )
                                    )
                                    || (
                                        leave.NumberOfDayOff >= 5
                                        && leave.DepartmentId == departmentId
                                    )
                                )
                            )
                        )
                    )
                    ||
                    // NGHỈ CHẾ ĐỘ
                    (
                        !leave.LeaveApplicationTypeCode.ToUpper().Contains("KL")
                        && (
                            (
                                PermissionChecker.IsGranted("Pages.LeaveRegistration.Approvel.TN")
                                && !PermissionChecker.IsGranted(
                                    "Pages.LeaveRegistration.Approvel.LDPTCHC"
                                )
                                && leave.NumberOfDayOff > 0
                                && leave.NumberOfDayOff < 14
                            )
                            || (
                                PermissionChecker.IsGranted("Pages.LeaveRegistration.Approvel.LDP")
                                && !PermissionChecker.IsGranted(
                                    "Pages.LeaveRegistration.Approvel.LDPTCHC"
                                )
                                && (
                                    leave.NumberOfDayOff >= 14
                                    || leave.ListRole.Contains("TN")
                                    || leave.ListRole.Contains("Thuky")
                                    || leave.ListRole.Contains("TK_TL_TGD")
                                )
                            )
                            || (
                                PermissionChecker.IsGranted(
                                    "Pages.LeaveRegistration.Approvel.LDPTCHC"
                                )
                                && leave.NumberOfDayOff >= 3
                                && leave.ListRole.Contains("LDP")
                                && !leave.ListRole.Contains("Thuky")
                            )
                        )
                    )
                );

            bool canExamine =
                (leave.Status == AppConsts.DangKy || leave.Status == AppConsts.XemXet)
                && leave.CensorId == userId
                && (
                    // NGHỈ CHẾ ĐỘ
                    (
                        !leave.LeaveApplicationTypeCode.ToUpper().Contains("KL")
                        && (
                            (
                                (
                                    PermissionChecker.IsGranted(
                                        "Pages.LeaveRegistration.Approvel.LDP"
                                    )
                                )
                                && !(
                                    PermissionChecker.IsGranted(
                                        "Pages.LeaveRegistration.Approvel.LDPTCHC"
                                    )
                                )
                                && (leave.NumberOfDayOff >= 3 && leave.NumberOfDayOff <= 14)
                            )
                            || (
                                (
                                    PermissionChecker.IsGranted(
                                        "Pages.LeaveRegistration.Approvel.LDPTCHC"
                                    )
                                )
                                && (
                                    ((leave.NumberOfDayOff >= 14))
                                    || (
                                        (leave.NumberOfDayOff >= 3)
                                        && (
                                            (leave.ListRole.Contains("TN"))
                                            || (leave.ListRole.Contains("Thuky"))
                                        )
                                    // &&
                                    // (leave.departmentId ==departmentId)
                                    )
                                    || (
                                        (leave.NumberOfDayOff >= 1)
                                        && (
                                            (leave.ListRole.Contains("PTGD"))
                                            || (leave.ListRole.Contains("TK_TL_TGD"))
                                        )
                                    )
                                )
                            )
                        )
                    )
                    ||
                    // NGHỈ KHÔNG LƯƠNG
                    (
                        leave.LeaveApplicationTypeCode.ToUpper().Contains("KL")
                        && (
                            (
                                (
                                    PermissionChecker.IsGranted(
                                        "Pages.LeaveRegistration.Approvel.LDP"
                                    )
                                )
                                && !(
                                    PermissionChecker.IsGranted(
                                        "Pages.LeaveRegistration.Approvel.LDPTCHC"
                                    )
                                )
                                && (leave.NumberOfDayOff < 5)
                            )
                            || (
                                (
                                    PermissionChecker.IsGranted(
                                        "Pages.LeaveRegistration.Approvel.LDPTCHC"
                                    )
                                )
                                && (
                                    (
                                        (leave.NumberOfDayOff >= 5)
                                        && !(leave.DepartmentId == departmentId)
                                    )
                                    || (
                                        (leave.NumberOfDayOff >= 1)
                                        && !(leave.DepartmentId == departmentId)
                                        && (
                                            (leave.ListRole.Contains("TN"))
                                            || (leave.ListRole.Contains("Thuky"))
                                            || (leave.ListRole.Contains("TK_TL_TGD"))
                                        )
                                    )
                                    || (
                                        (leave.NumberOfDayOff >= 1)
                                        && ((leave.ListRole.Contains("PTGD")))
                                    )
                                )
                            )
                        )
                    )
                );

            // Thông qua
            bool canPass =
                (
                    leave.Status == AppConsts.DangKy
                    || leave.Status == AppConsts.KiemTra
                    || leave.Status == AppConsts.XemXet
                )
                && leave.CensorId == userId
                && (
                    // NGHỈ CHẾ ĐỘ
                    (
                        !leave.LeaveApplicationTypeCode.ToUpper().Contains("KL")
                        && (
                            // NLD
                            (
                                (
                                    PermissionChecker.IsGranted(
                                        "Pages.LeaveRegistration.Approvel.LDP"
                                    )
                                )
                                && !(
                                    PermissionChecker.IsGranted(
                                        "Pages.LeaveRegistration.Approvel.LDPTCHC"
                                    )
                                )
                                && (leave.NumberOfDayOff < 3)
                                && (!(leave.ListRole.Contains("TN")))
                                //&&
                                //(!(leave.ListRole.Contains("Thuky")))
                                && !(leave.ListRole.Contains("TK_TL_TGD"))
                            )
                            || (
                                (
                                    PermissionChecker.IsGranted(
                                        "Pages.LeaveRegistration.Approvel.LDPTCHC"
                                    )
                                )
                                && (
                                    (
                                        (leave.NumberOfDayOff >= 3 && leave.NumberOfDayOff < 14)
                                        && !(leave.ListRole.Contains("TN"))
                                        && !(leave.ListRole.Contains("LDP"))
                                        && (!(leave.ListRole.Contains("Thuky")))
                                        && !(leave.ListRole.Contains("TK_TL_TGD"))
                                    )
                                    || (
                                        (leave.NumberOfDayOff < 3)
                                        && (leave.ListRole.Contains("LDP"))
                                    )
                                    || (
                                        (leave.NumberOfDayOff < 3)
                                        // &&
                                        // (leave.departmentId ==departmentId)
                                        && (
                                            (leave.ListRole.Contains("TN"))
                                            || (
                                                (leave.ListRole.Contains("Thuky"))
                                                && !(leave.ListRole.Contains("TK_TL_TGD"))
                                            )
                                        )
                                    )
                                )
                            )
                            || (
                                (
                                    PermissionChecker.IsGranted(
                                        "Pages.LeaveRegistration.Approvel.PGD"
                                    )
                                )
                                && (
                                    ((leave.NumberOfDayOff >= 14))
                                    || (
                                        (leave.NumberOfDayOff >= 3)
                                        && (
                                            (leave.ListRole.Contains("TN"))
                                            || (leave.ListRole.Contains("LDP"))
                                            || (leave.ListRole.Contains("LD-TCHC"))
                                            || (leave.ListRole.Contains("Thuky"))
                                        )
                                    )
                                    || ((leave.ListRole.Contains("TK_TL_TGD")))
                                )
                            )
                        )
                    )
                    ||
                    // NGHỈ KHÔNG LƯƠNG
                    (
                        leave.LeaveApplicationTypeCode.ToUpper().Contains("KL")
                        && (
                            // NLD
                            (
                                (
                                    PermissionChecker.IsGranted(
                                        "Pages.LeaveRegistration.Approvel.LDPTCHC"
                                    )
                                )
                                && (
                                    (
                                        (leave.NumberOfDayOff < 5)
                                        && !(leave.ListRole.Contains("TN"))
                                        && !(leave.ListRole.Contains("LDP"))
                                        && (!(leave.ListRole.Contains("Thuky")))
                                        && !(leave.ListRole.Contains("TK_TL_TGD"))
                                    )
                                // ||
                                // (
                                //     (leave.NumberOfDayOff >= 1)
                                //     &&
                                //     (
                                //         (leave.ListRole.Contains("PTGD"))
                                //     )
                                // )
                                )
                            )
                            || (
                                (
                                    PermissionChecker.IsGranted(
                                        "Pages.LeaveRegistration.Approvel.PGD"
                                    )
                                )
                                && (
                                    ((leave.NumberOfDayOff >= 5))
                                    || (
                                        (leave.NumberOfDayOff >= 1)
                                        && (
                                            (leave.ListRole.Contains("TN"))
                                            || (leave.ListRole.Contains("LD-TCHC"))
                                            || (leave.ListRole.Contains("LDP"))
                                            || (leave.ListRole.Contains("Thuky"))
                                        )
                                    )
                                    || (leave.ListRole.Contains("TK_TL_TGD"))
                                )
                            )
                        )
                    )
                );

            // Phê duyệt
            bool canApprove = (
                leave.Status != AppConsts.PheDuyet
                && leave.Status != AppConsts.TuChoi
                && leave.CensorId == userId
                && PermissionChecker.IsGranted("Pages.LeaveRegistration.LeaveApplication.Approve")
                && (
                    leave.Status == AppConsts.XemXet
                    || leave.Status == AppConsts.ThongQua
                    || leave.Status == AppConsts.KiemTra
                    || leave.Status == AppConsts.DangKy
                )
                && (
                    // NGHỈ CHẾ ĐỘ
                    (
                        !leave.LeaveApplicationTypeCode.ToUpper().Contains("KL")
                        && (
                            // NLD
                            (
                                (
                                    PermissionChecker.IsGranted(
                                        "Pages.LeaveRegistration.Approvel.LDPTCHC"
                                    )
                                )
                                && (leave.NumberOfDayOff < 3)
                                && (
                                    !(leave.ListRole.Contains("TN"))
                                    && !(leave.ListRole.Contains("Thuky"))
                                    && !(leave.ListRole.Contains("LDP"))
                                    && !(leave.ListRole.Contains("PTGD"))
                                    && !(leave.ListRole.Contains("TK_TL_TGD"))
                                )
                            )
                            || (
                                (
                                    PermissionChecker.IsGranted(
                                        "Pages.LeaveRegistration.Approvel.PGD"
                                    )
                                )
                                && (
                                    (
                                        (leave.NumberOfDayOff >= 3 && leave.NumberOfDayOff < 14)
                                        && !(leave.ListRole.Contains("TN"))
                                        && (!(leave.ListRole.Contains("Thuky")))
                                        && !(leave.ListRole.Contains("LDP"))
                                        && !(leave.ListRole.Contains("LD-TCHC"))
                                    )
                                    || (
                                        (leave.NumberOfDayOff < 3)
                                        && (
                                            (leave.ListRole.Contains("TN"))
                                            || (leave.ListRole.Contains("LDP"))
                                            || (leave.ListRole.Contains("LD-TCHC"))
                                            || (leave.ListRole.Contains("Thuky"))
                                            || !(leave.ListRole.Contains("TK_TL_TGD"))
                                        )
                                        && leave.Status != AppConsts.XemXet
                                    )
                                )
                            )
                            || (
                                (
                                    PermissionChecker.IsGranted(
                                        "Pages.LeaveRegistration.Approvel.TGD"
                                    )
                                )
                                && (
                                    ((leave.NumberOfDayOff >= 14))
                                    || (
                                        (leave.NumberOfDayOff >= 3)
                                        && (
                                            (leave.ListRole.Contains("TN"))
                                            || (leave.ListRole.Contains("LDP"))
                                            || (leave.ListRole.Contains("LD-TCHC"))
                                            || (leave.ListRole.Contains("Thuky"))
                                        )
                                    )
                                    || (
                                        (leave.NumberOfDayOff >= 1)
                                        && (
                                            (leave.ListRole.Contains("PTGD"))
                                            || (leave.ListRole.Contains("TK_TL_TGD"))
                                        )
                                    )
                                )
                            )
                        )
                    )
                    ||
                    // NGHỈ KHÔNG LƯƠNG
                    (
                        leave.LeaveApplicationTypeCode.ToUpper().Contains("KL")
                        && (
                            // NLD
                            (
                                (
                                    PermissionChecker.IsGranted(
                                        "Pages.LeaveRegistration.Approvel.PGD"
                                    )
                                )
                                && (leave.NumberOfDayOff < 5)
                                && !(leave.ListRole.Contains("TN"))
                                && (!(leave.ListRole.Contains("Thuky")))
                                && !(leave.ListRole.Contains("LDP"))
                                && !(leave.ListRole.Contains("LD-TCHC"))
                                && !(leave.ListRole.Contains("TK_TL_TGD"))
                            )
                            || (
                                (
                                    PermissionChecker.IsGranted(
                                        "Pages.LeaveRegistration.Approvel.TGD"
                                    )
                                )
                                && (
                                    ((leave.NumberOfDayOff >= 5))
                                    || (
                                        (leave.NumberOfDayOff >= 1)
                                        && (
                                            ((leave.ListRole.Contains("TN")))
                                            || ((leave.ListRole.Contains("LDP")))
                                            || ((leave.ListRole.Contains("PTGD")))
                                            || ((leave.ListRole.Contains("LD-TCHC")))
                                            || (leave.ListRole.Contains("TK_TL_TGD"))
                                        )
                                    )
                                )
                            )
                        )
                    )
                )
            );

            var canReApprove = (
                leave.Status == AppConsts.TuChoi
                && leave.FromDate.Value.Date > DateTime.Now.Date
                && leave.CensorId == userId
            );
            var canReDeclined = (
                leave.Status == AppConsts.PheDuyet
                && leave.FromDate.Value.Date > DateTime.Now.Date
                && leave.CensorId == userId
            );

            var CheckLeave = new CheckLeaveDto();
            if (canReview)
            {
                CheckLeave.Status = 2;
                CheckLeave.TitleName = "Người xem xét";
            }
            else if (canExamine)
            {
                CheckLeave.Status = 3;
                CheckLeave.TitleName = "Người kiểm tra";
            }
            else if (canPass)
            {
                CheckLeave.Status = 4;
                CheckLeave.TitleName = "Người thông qua";
            }
            else if (canApprove)
            {
                CheckLeave.Status = 5;
                CheckLeave.TitleName = "Người phê duyệt";
            }
            else if (canReApprove)
            {
                CheckLeave.Status = 7;
                CheckLeave.TitleName = "Người phê duyệt lại";
            }
            else if (canReDeclined)
            {
                CheckLeave.Status = 8;
                CheckLeave.TitleName = "Người phê duyệt lại";
            }
            else
            {
                CheckLeave.Status = 666;
                CheckLeave.TitleName = "Người được trao quyền";
            }

            if (userId != leave.CensorId)
            {
                if (leave.Status == 1)
                {
                    CheckLeave.TitleName = "Người xem xét";
                }
                else if (leave.Status == 2)
                {
                    CheckLeave.TitleName = "Người kiểm tra";
                }
                else if (leave.Status == 3)
                {
                    CheckLeave.TitleName = "Người thông qua";
                }
                else if (leave.Status == 4)
                {
                    CheckLeave.TitleName = "Người phê duyệt";
                }
                else if (leave.Status == 5)
                {
                    CheckLeave.TitleName = "Người phê duyệt";
                }
                else if (leave.Status == 6)
                {
                    CheckLeave.TitleName = "Người từ chối";
                }
                else if (leave.Status == 7)
                {
                    CheckLeave.TitleName = "Người phê duyệt lại";
                }
                else if (leave.Status == 8)
                {
                    CheckLeave.TitleName = "Người từ chối lại";
                }
            }
            else
            {
                if (leave.Status == 5)
                {
                    CheckLeave.TitleName = "Người phê duyệt";
                }
                else if (leave.Status == 6)
                {
                    CheckLeave.TitleName = "Người từ chối";
                }
            }

            return CheckLeave; // Nếu không thuộc điều kiện nào
        }

        public async Task<CheckLeaveDto> CheckLeaveRequestNew(LeaveApplicationDto leave)
        {
            var CheckLeave = new CheckLeaveDto();
            if (leave.TypeApprovalId != null)
            {
                var statusApproval = await _statusApprovalRepository.FirstOrDefaultAsync(x =>
                    x.TypeApproval == leave.TypeApprovalId && x.Step == leave.Status
                );
                if (statusApproval != null)
                {
                    CheckLeave.TitleName = statusApproval.Name;
                }
            }

            return CheckLeave; // Nếu không thuộc điều kiện nào
        }

        public async Task<PagedResultDto<LeaveNotApprovelDto>> GetLeaveNotApproved(
            FilterLeaveApplicationDto input
        )
        {
            try
            {
                var user = await this.GetCurrentUserAsync();
                var userId = user.Id; // this.AbpSession.UserId;approvalNote
                var departmentId = user.DepartmentId.HasValue ? user.DepartmentId : 0;

                var queryable = _leaveApplicationRepository.GetAll();
                queryable = queryable.Where(x => x.SubscriberId != userId);

                // Lấy dữ liệu theo lọc
                if (input.LeaveApplicationTypeId.HasValue)
                    queryable = queryable.Where(x =>
                        x.ApplicationTypeId == input.LeaveApplicationTypeId
                    );

                if (input.UserId.HasValue)
                    queryable = queryable.Where(x => x.SubscriberId == input.UserId);

                if (input.FromDate.HasValue)
                    queryable = queryable.Where(x => x.FromDate >= input.FromDate);
                if (input.ToDate.HasValue)
                    queryable = queryable.Where(x => x.ToDate <= input.ToDate);

                if (!string.IsNullOrEmpty(input.DepartmentId))
                {
                    var a = input.DepartmentId.Split(",");
                    queryable = queryable.Where(c => a.Contains(c.DepartmentId.ToString()));
                }

                if (input.Status > 0)
                    queryable = queryable.Where(c => c.Status == input.Status);

                var query = queryable
                    .Select(c => new LeaveNotApprovelDto
                    {
                        Id = c.Id,
                        STT = c.STT,
                        ApplicationTypeId = c.ApplicationTypeId,
                        LeaveApplicationTypeTitle = c.LeaveApplicationType_.Title,
                        SubscriberId = c.SubscriberId,
                        SubcriberName = c.Subscriber_.Surname,
                        SubcriberEmail = c.Subscriber_.EmailAddress,
                        DepartmentId = c.DepartmentId,
                        DepartmentName = c.Department_.ShortName,
                        FromDate = c.FromDate,
                        ToDate = c.ToDate,
                        ApproverId = c.ApproverId,
                        ApproverName = c.Approver_.Surname,
                        ApproverEmail = c.Approver_.EmailAddress,
                        ApprovedDate = c.ApprovedDate,
                        AuthorizedPersonId = c.AuthorizedPersonId,
                        AuthorizedPersonName = c.Authorized_.Surname,
                        CensorId = c.CensorId,
                        CensorName = c.Censor_.Surname,
                        CensorEmail = c.Censor_.EmailAddress,
                        RelatedPeopleList = c.RelatedPeopleList,
                        RelatedGroupList = c.RelatedGroupList,
                        //RegistrationReason = c.LeaveApplicationReason_.Title != null ? c.LeaveApplicationReason_.Title : c.RegistrationReason,
                        RegistrationReason = !string.IsNullOrWhiteSpace(c.RegistrationReason)
                            ? c.RegistrationReason
                            : c.LeaveApplicationReason_.Title,
                        ReasonEdit = c.ReasonEdit,
                        ReasonDelete = c.ReasonDelete,
                        NumberOfDayOff = c.NumberOfDayOff,
                        Note = c.Note,
                        Description = c.Description,
                        Status = c.Status,
                        IsHalfDayLeave = c.IsHalfDayLeave,
                        IsWeekendLeave = c.IsWeekendLeave,
                        IsActive = c.IsActive,
                        IsDeleted = c.IsDeleted,
                        LastModificationTime = c.LastModificationTime,
                        CreationTime = c.CreationTime,
                        AnnualLeaveWhenCreate = c.AnnualLeaveWhenCreate,
                    })
                    .WhereIf(
                        !input.Filter.IsNullOrEmpty(),
                        x =>
                            x.NumberOfDayOff.ToString().Equals(input.Filter)
                            || x.SubcriberName.ToUpper().Contains(input.Filter.ToUpper())
                            || x.DepartmentName.ToUpper().Contains(input.Filter.ToUpper())
                    )
                    .Where(w => w.Status != 5 && w.Status != 6)
                    .ToList();

                List<LeaveNotApprovelDto> lstResult = new List<LeaveNotApprovelDto>();
                if (query != null && query.Count > 0)
                {
                    int STT = 1;
                    foreach (var item in query)
                    {
                        if (item.FromDate.Value.Date < DateTime.Now.Date)
                        {
                            item.ApprovelNote =
                                "Đơn nghỉ đã quá thời hạn phê duyệt "
                                + (DateTime.Now - item.FromDate.Value).Days
                                + " ngày.";
                        }
                        else if (item.FromDate.Value.Date == DateTime.Now.Date)
                        {
                            item.ApprovelNote = "Hôm nay là ngày NLĐ nghỉ.";
                        }
                        else
                        {
                            item.ApprovelNote =
                                "Thời hạn để phê duyệt đơn nghỉ phép còn "
                                + (item.FromDate.Value - DateTime.Now).Days
                                + " ngày.";
                        }
                        if (
                            (item.Status != 5 && item.Status != 6)
                            && item.CensorId == AbpSession.UserId
                            && item.SubscriberId != AbpSession.UserId
                        )
                        {
                            item.STT = STT;
                            STT++;
                        }
                        else { }
                        lstResult.Add(item);
                    }
                }

                var totalCount = lstResult.AsQueryable().Count();
                var pagedDepartment = lstResult
                    .AsQueryable()
                    .OrderBy(input.Sorting)
                    .PageBy(input)
                    .ToList();

                var result = ObjectMapper.Map<List<LeaveNotApprovelDto>>(pagedDepartment);

                return new PagedResultDto<LeaveNotApprovelDto>(totalCount, result);
            }
            catch (Exception ex)
            {
                throw new UserFriendlyException(ex.Message, ex.InnerException);
            }
        }

        public async Task LeaveNotApprovalSendMail(LeaveNotApprovelDto data)
        {
            try
            {
                var paramsSys = await _parameterRepository
                    .GetAll()
                    .Where(x => x.SYS_PARAM_CODE == "APP_URL")
                    .FirstOrDefaultAsync();
                var templateName = "CANH-BAO-NGHI-PHEP";
                var templateEmailOrigin = await _emailTemplateRepository.FirstOrDefaultAsync(x =>
                    x.TemplateName == templateName && x.IsDeleted == false
                );
                if (templateEmailOrigin != null)
                {
                    var templateEmail = new EmailTemplate();
                    templateEmail.TemplateName = templateEmailOrigin.TemplateName;
                    templateEmail.Bcc = templateEmailOrigin.Bcc;
                    templateEmail.Cc = templateEmailOrigin.Cc;
                    templateEmail.EmailSubTitle = templateEmailOrigin.EmailSubTitle;
                    templateEmail.EmailTitle = templateEmailOrigin.EmailTitle;
                    templateEmail.MailSubject = templateEmailOrigin.MailSubject;
                    templateEmail.TemplateContent = templateEmailOrigin.TemplateContent;
                    var emailTempalte = GetTitleAndSubTitle(
                        null,
                        templateEmail.EmailTitle,
                        templateEmail.EmailSubTitle
                    );

                    var templateContent = templateEmail.TemplateContent.Replace(
                        "{USER_NAME}",
                        data.SubcriberName
                    );
                    templateContent = templateContent.Replace(
                        "{LEAVE_TITLE}",
                        data.LeaveApplicationTypeTitle
                    );
                    templateContent = templateContent.Replace(
                        "{FROM_DATE}",
                        data.FromDate.Value.ToString("dd/MM/yyyy")
                    );
                    templateContent = templateContent.Replace(
                        "{TO_DATE}",
                        data.ToDate.Value.ToString("dd/MM/yyyy")
                    );
                    templateContent = templateContent.Replace("{CENSOR_NAME}", data.CensorName);

                    var mailMessage = new StringBuilder();
                    mailMessage.AppendLine(templateContent);

                    await ReplaceBodyAndSend(
                        data.SubcriberEmail,
                        templateEmail.MailSubject,
                        emailTempalte,
                        mailMessage
                    );
                }
                else
                {
                    throw new UserFriendlyException("Không tìm thấy template mail");
                }
            }
            catch (Exception ex)
            {
                Logger.Error(ex.Message, ex);
            }
        }

        public async Task<PagedResultDto<LeaveFastApprovelDto>> GetLeaveFastApproved(
            FilterLeaveApplicationDto input
        )
        {
            try
            {
                var user = await this.GetCurrentUserAsync();
                var userId = user.Id;
                var departmentId = user.DepartmentId ?? 0;

                // Lấy ApplicationTypeId của "KL" trước để tránh query nhiều lần
                var klApplicationTypeId = _leaveApplicationTypeRepository
                    .GetAll()
                    .Where(w => w.Code == "KL")
                    .Select(s => s.Id)
                    .FirstOrDefault();

                var departmentTCHC = _departmentRepository
                    .GetAll()
                    .Where(w => w.ShortName == "TCHC")
                    .Select(s => s.Id)
                    .FirstOrDefault();

                var queryable = _leaveApplicationRepository
                    .GetAll()
                    .AsNoTracking()
                    .Where(x => x.SubscriberId != userId);

                if (input.LeaveApplicationTypeId.HasValue)
                    queryable = queryable.Where(x =>
                        x.ApplicationTypeId == input.LeaveApplicationTypeId
                    );

                if (input.UserId.HasValue)
                    queryable = queryable.Where(x => x.SubscriberId == input.UserId);

                if (input.FromDate.HasValue)
                    queryable = queryable.Where(x => x.FromDate >= input.FromDate);
                if (input.ToDate.HasValue)
                    queryable = queryable.Where(x => x.ToDate <= input.ToDate);

                if (!string.IsNullOrEmpty(input.DepartmentId))
                {
                    var a = input.DepartmentId.Split(",");
                    queryable = queryable.Where(c => a.Contains(c.DepartmentId.ToString()));
                }

                if (input.Status > 0)
                    queryable = queryable.Where(c => c.Status == input.Status);

                var query = queryable
                    .Select(c => new LeaveFastApprovelDto
                    {
                        Id = c.Id,
                        STT = c.STT,
                        CreationTime = c.CreationTime,
                        ApplicationTypeId = c.ApplicationTypeId,
                        LeaveApplicationTypeTitle = c.LeaveApplicationType_.Title,
                        LeaveApplicationTypeCode = c.LeaveApplicationType_.Code,
                        SubscriberId = c.SubscriberId,
                        SubcriberName = c.Subscriber_.Surname,
                        SubcriberEmail = c.Subscriber_.EmailAddress,
                        DepartmentId = c.DepartmentId,
                        DepartmentName = c.Department_.ShortName,
                        FromDate = c.FromDate,
                        ToDate = c.ToDate,
                        ApproverId = c.ApproverId,
                        ApproverName = c.Approver_.Surname,
                        ApproverEmail = c.Approver_.EmailAddress,
                        ApprovedDate = c.ApprovedDate,
                        AuthorizedPersonId = c.AuthorizedPersonId,
                        AuthorizedPersonName = c.Authorized_.Surname,
                        CensorId = c.CensorId,
                        CensorName = c.Censor_.Surname,
                        CensorEmail = c.Censor_.EmailAddress,
                        RegistrationReason = !string.IsNullOrWhiteSpace(c.RegistrationReason)
                            ? c.RegistrationReason
                            : c.LeaveApplicationReason_.Title,
                        NumberOfDayOff = c.NumberOfDayOff,
                        Status = c.Status,
                    })
                    .Where(w =>
                        w.CensorId == userId
                        && w.Status != 5
                        && w.Status != 6
                        && (
                            w.Status == 4
                            || (
                                w.ApplicationTypeId != klApplicationTypeId
                                && w.NumberOfDayOff < 3
                                && w.DepartmentId == departmentId
                                && w.DepartmentId == departmentTCHC
                            )
                        )
                    )
                    .ToList();

                foreach (var item in query)
                {
                    item.ApprovelNote =
                        item.FromDate.Value.Date < DateTime.Now.Date
                            ? $"Đơn nghỉ đã quá thời hạn phê duyệt {(DateTime.Now - item.FromDate.Value).Days} ngày."
                            : $"Thời hạn để phê duyệt đơn nghỉ phép còn {(item.FromDate.Value - DateTime.Now).Days} ngày.";
                }

                var totalCount = query.Count();
                var pagedDepartment = query
                    .AsQueryable()
                    .OrderBy(input.Sorting)
                    .PageBy(input)
                    .ToList();
                return new PagedResultDto<LeaveFastApprovelDto>(totalCount, pagedDepartment);
            }
            catch (Exception ex)
            {
                throw new UserFriendlyException(
                    "Đã xảy ra lỗi khi lấy dữ liệu.",
                    ex.InnerException
                );
            }
        }

        //public async Task RestoreOriginalPermissions(long userId)
        //{
        //    var currentUser = await _userManager.FindByIdAsync(userId.ToString());
        //    if (currentUser != null)
        //    {
        //        // Khôi phục lại quyền ban đầu
        //        var httpContext = _httpContextAccessor.HttpContext;
        //        if (httpContext != null)
        //        {
        //            var originalRoles = httpContext.Items["OriginalRoles"] as IList<string>;
        //            var originalPermissions = httpContext.Items["OriginalPermissions"] as IList<Permission>;
        //            if (originalRoles != null && originalPermissions != null)
        //            {
        //                // Xóa các quyền hiện tại
        //                var currentRoles = await _userManager.GetRolesAsync(currentUser);
        //                await _userManager.RemoveFromRolesAsync(currentUser, currentRoles.ToArray());

        //                // Khôi phục lại quyền ban đầu
        //                await _userManager.AddToRolesAsync(currentUser, originalRoles.ToArray());
        //                await _userManager.SetGrantedPermissionsAsync(currentUser, originalPermissions);
        //            }
        //        }
        //    }
        //}

        // Whatever
        public async Task CreateWhatever(LeaveApplicationDto input)
        {
            try
            {
                input.TenantId = AbpSession.GetTenantId();
                input.IsActive = true;
                input.IsDeleted = false;
                //input.IsHalfDayLeave = false;

                var entity = ObjectMapper.Map<Models.Business.LeaveApplication>(input);

                await _leaveApplicationRepository.InsertAsync(entity);
                await CurrentUnitOfWork.SaveChangesAsync();

                //if (input.SendMail)
                //{
                //    // Send mail to Relate people
                //    var emailAddress = await GetUserEmailRelativeLeaveApplication(entity.Id);
                //    await SendMailToRelativePeople(emailAddress, entity.Id, entity.ApplicationTypeId, "REGISTER-LEAVE-APPLICATION");
                //    // Send Notification
                //    var user = await _userRepository.FirstOrDefaultAsync(input.CensorId.Value);
                //    SendNotification sendNotify = new SendNotification();
                //    NotificationDto rs = new NotificationDto();
                //    if (user != null)
                //    {
                //        PushNotificationCreate data = new PushNotificationCreate();
                //        data.userId = entity.CensorId.Value;
                //        data.CreatorUserId = entity.SubscriberId.Value;
                //        data.title = "Đơn xin nghỉ";
                //        data.body = "Bạn đang có đơn nghỉ phép cần duyệt";

                //        data.TypeId = entity.Id;
                //        data.Color = 1;
                //        //sendNotify = await _pushNotificationApp.PushNotifcation(data);
                //        if (sendNotify.Id != null && sendNotify.Id != 0)
                //        {
                //            rs.Id = sendNotify.Id;
                //            rs.Title = sendNotify.Title;
                //            rs.Content = sendNotify.Content;
                //            rs.IsRead = sendNotify.IsRead;
                //            rs.Type = sendNotify.Type;
                //            rs.TypeId = sendNotify.TypeId;
                //            rs.Color = sendNotify.Color;
                //            rs.CreationTime = sendNotify.CreationTime;
                //            rs.LeaveType = entity.LeaveApplicationType_.Title;
                //            rs.NameSender = entity.Subscriber_.Surname;
                //            rs.UserIdSender = entity.SubscriberId.Value;
                //            rs.NameReceiver = entity.Censor_.Surname;
                //            rs.UserIdReceiver = entity.CensorId.Value;
                //            rs.NameSubcriber = entity.Subscriber_.Surname;
                //        }
                //    }
                //}
                //return rs;
            }
            catch (Exception ex)
            {
                throw new UserFriendlyException(ex.Message);
            }
        }

        public async Task<long> GetTypeApprove(decimal? SoNgayNghi, long LeaveType)
        {
            long TypeApproveId = 0;
            var leaveTypeCode = "";
            var chucVu = "";
            var leaveType = await _leaveApplicationTypeRepository.FirstOrDefaultAsync(LeaveType);
            if (leaveType != null)
            {
                leaveTypeCode = leaveType.Code;
                var user = AbpSession.GetUserId();

                var role = new List<string>();

                var userRole = await _userRoleRepository
                    .GetAll()
                    .Where(x => x.UserId == user)
                    .ToListAsync();

                if (userRole != null)
                {
                    foreach (var detailRole in userRole)
                    {
                        var roleCode = await _roleRepository.FirstOrDefaultAsync(detailRole.RoleId);
                        if (roleCode != null)
                        {
                            role.Add(roleCode.RoleCode);
                        }
                    }
                }
                if (role.Contains("PTGD"))
                {
                    chucVu = "PTGD";
                }
                else if (role.Contains("LDP"))
                {
                    chucVu = "LDP";
                }
                else if (role.Contains("TK_TL_TGD"))
                {
                    chucVu = "TK_TL_TGD";
                }
                else if (role.Contains("Thuky"))
                {
                    chucVu = "Thuky";
                }
                else if (role.Contains("TN"))
                {
                    chucVu = "TN";
                }
                else
                {
                    chucVu = "NLD";
                }

                var roleCodeFinal = await _roleRepository.FirstOrDefaultAsync(x =>
                    x.RoleCode == chucVu
                );

                var typeApprove = await _typeApprovalRepository.FirstOrDefaultAsync(x =>
                    (
                        (x.ToNumberDate == null && x.FromNumberDate < SoNgayNghi)
                        || (
                            x.ToNumberDate != null
                            && x.FromNumberDate < SoNgayNghi
                            && SoNgayNghi < x.ToNumberDate
                        )
                    )
                    && (
                        (leaveTypeCode.Contains("KL") && x.TypeNghiPhep == "KL")
                        || (!leaveTypeCode.Contains("KL") && x.TypeNghiPhep == "P")
                    )
                    && ("," + x.Target + ",").Contains("," + roleCodeFinal.Id + ",")
                    && x.IsActive == true
                );
                if (typeApprove != null)
                {
                    TypeApproveId = typeApprove.Id;
                }
            }

            return TypeApproveId;
        }

        public async Task<long> CheckNextStep(long LeaveId)
        {
            long Id = 0;
            try
            {
                var leave = await _leaveApplicationRepository.FirstOrDefaultAsync(LeaveId);
                if (leave != null)
                {
                    var typeProcess = await _typeApprovalRepository.FirstOrDefaultAsync(x =>
                        x.Id == (long)leave.TypeApprovalId && x.IsActive == true
                    );
                    if (typeProcess != null)
                    {
                        var status = await _statusApprovalRepository.FirstOrDefaultAsync(x =>
                            x.TypeApproval == typeProcess.Id && x.Step == leave.Status + 1
                        );
                        if (status != null)
                        {
                            var userApp = await _userApprovalRepository.FirstOrDefaultAsync(x =>
                                x.StatusApproval == status.Id
                            );
                            if (userApp != null)
                            {
                                Id = status.Id;
                            }
                            //else
                            //{
                            //    var nextStatus = await _statusApprovalRepository.FirstOrDefaultAsync(x => x.TypeApproval == typeProcess.Id && x.Step == leave.Status + 2);
                            //    if (nextStatus == null)
                            //    {
                            //        Id = status.Id;
                            //    }
                            //}
                        }
                    }
                }
            }
            catch (Exception e) { }
            return Id;
        }

        public async Task<long> GetMaxStatus(long? TypeApprovalId)
        {
            var maxStatus = 0;
            try
            {
                if (TypeApprovalId != null)
                {
                    var statusApproval = await _statusApprovalRepository
                        .GetAll()
                        .Where(x => x.TypeApproval == (long)TypeApprovalId)
                        .ToListAsync();
                    maxStatus = statusApproval.AsQueryable().Max(x => x.Step);
                }
            }
            catch (Exception e) { }
            return maxStatus;
        }

        //public async Task<string> CheckDonNghiPhep (long IdLeave)
        //{
        //    var result = "";
        //    var LeaveApp = await _leaveApplicationRepository.FirstOrDefaultAsync(IdLeave);

        //    if (LeaveApp != null)
        //    {
        //        var fromDate = DateTime.Now;
        //        var minDate = fromDate.AddDays(-7);
        //        var checkLeave = await _leaveApplicationRepository.GetAll().Where(x => x.CreationTime < fromDate && x.CreationTime >= minDate && x.Status != -1 && x.SubscriberId == LeaveApp.SubscriberId && x.Id != IdLeave).ToListAsync();
        //        if (checkLeave.Count() >= 2)
        //        {
        //            result = "Người lao động đã xin nghỉ hơn 2 lần trong vòng 7 ngày";
        //        }
        //    }

        //    return result;
        //}

        public async Task<string> CheckDonNghiPhep(long IdLeave)
        {
            var warnings = new List<string>();

            var leaveApp = await _leaveApplicationRepository.FirstOrDefaultAsync(IdLeave);
            if (leaveApp == null)
                return string.Empty;

            var now = DateTime.Now.Date;
            int currentYear = leaveApp.FromDate.Value.Year;

            var startOfMonth = new DateTime(
                leaveApp.FromDate.Value.Year,
                leaveApp.FromDate.Value.Month,
                1
            );
            var endOfMonth = startOfMonth.AddMonths(1).AddDays(-1);

            var startOf7Days = now.AddDays(-7);

            var leaveTypes = await _leaveApplicationTypeRepository.GetAll().ToListAsync();

            var approvedLeaves = await _leaveApplicationRepository
                .GetAll()
                .Where(x =>
                    x.SubscriberId == leaveApp.SubscriberId
                    && x.Status != -1
                    && x.Id != IdLeave
                    && x.FromDate.HasValue
                    && x.ToDate.HasValue
                )
                .Join(
                    leaveTypes,
                    leave => leave.ApplicationTypeId,
                    type => type.Id,
                    (leave, type) => new { leave, type }
                )
                .Where(x =>
                    x.type.Code != "CT"
                    && x.type.Code != "NB"
                    && x.type.Code != "NB/2"
                    && x.type.Code != "TS"
                    && x.type.Code != "H"
                    && x.type.Code != "H/2"
                    && x.type.Code != "Ô"
                    && x.type.Code != "R"
                )
                .Select(x => x.leave)
                .ToListAsync();

            var currenLeaveType = leaveTypes.FirstOrDefault(x =>
                x.Id == leaveApp.ApplicationTypeId
            );
            var excludesCode = new[] { "CT", "NB", "TS", "NB/2", "H", "H/2", "Ô", "R" };

            decimal currentLeaveDays =
                currenLeaveType != null && excludesCode.Contains(currenLeaveType.Code)
                    ? 0m
                    : (leaveApp.NumberOfDayOff ?? 0m);

            var startOfYear = new DateTime(now.Year, 1, 1);
            var endOfToday = now;

            decimal totalDaysInYear = approvedLeaves
                .Where(x =>
                    x.FromDate.Value.Year <= endOfToday.Year
                    && x.ToDate.Value.Year >= startOfYear.Year
                )
                .Sum(x =>
                {
                    var from =
                        x.FromDate.Value.Date < startOfYear ? startOfYear : x.FromDate.Value.Date;
                    var to = x.ToDate.Value.Date > endOfToday ? endOfToday : x.ToDate.Value.Date;

                    var actualDays = (to - from).Days + 1;
                    var declaredDays = x.NumberOfDayOff ?? 0m;

                    return declaredDays > actualDays ? actualDays : declaredDays;
                });

            decimal totalDaysInYearWithCurrent = totalDaysInYear + currentLeaveDays;

            if (totalDaysInYearWithCurrent > 12)
            {
                warnings.Add(
                    $"Cảnh báo nhân sự đã nghỉ {totalDaysInYearWithCurrent.ToString("0.#", new CultureInfo("vi-VN"))} ngày trong năm."
                );
            }

            decimal totalDaysInMonth = approvedLeaves
                .Where(x =>
                    x.FromDate.Value.Date <= endOfMonth && x.ToDate.Value.Date >= startOfMonth
                )
                .Sum(x => (decimal)(x.NumberOfDayOff ?? 0));

            decimal totalDaysInMonthWithCurrent = totalDaysInMonth + currentLeaveDays;

            if (totalDaysInMonthWithCurrent > 2)
            {
                warnings.Add(
                    $"Nhân sự đã xin nghỉ {totalDaysInMonthWithCurrent.ToString("0.#", new CultureInfo("vi-VN"))} ngày trong 1 tháng."
                );
            }

            decimal totalDaysIn7Days = approvedLeaves
                .Where(x => x.FromDate.Value.Date <= now && x.ToDate.Value.Date >= startOf7Days)
                .Sum(x => (decimal)(x.NumberOfDayOff ?? 0));

            decimal totalDaysIn7DaysWithCurrent = totalDaysIn7Days + currentLeaveDays;

            if (totalDaysIn7DaysWithCurrent > 1)
            {
                warnings.Add(
                    $"Nhân sự đã xin nghỉ {totalDaysIn7DaysWithCurrent.ToString("0.#", new CultureInfo("vi-VN"))} ngày trong vòng 7 ngày."
                );
            }

            bool isContinuousLeave =
                totalDaysInMonthWithCurrent > 2
                || totalDaysIn7DaysWithCurrent > 1
                || totalDaysInYearWithCurrent > 12;

            if (isContinuousLeave)
            {
                warnings.Insert(0, "Cảnh báo nhân sự nghỉ liên tục!");
            }

            return string.Join(Environment.NewLine, warnings);
        }
    }
}
