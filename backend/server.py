from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from sqlmodel import Field, Session, SQLModel, create_engine, select, delete
from passlib.context import CryptContext
from datetime import datetime, timedelta, timezone
from typing import Optional, List, Union
from models import User, Goal, Task, SubTask, TaskStatus, GoalStatus
from pathlib import Path
import google.generativeai as genai
from ics import Calendar, Event
import uuid, os, re, json
import jwt

# Load environment variables
from dotenv import load_dotenv
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# === SCHEMAS ===
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    full_name: Optional[str] = None
    password: str

class UserResponse(BaseModel):
    id: int
    username: str
    email: str
    full_name: Optional[str]
    is_active: bool

class Token(BaseModel):
    access_token: str
    token_type: str

class GoalCreate(BaseModel):
    goal_name: str
    description: Optional[str] = None
    weeks: int

class GoalResponse(BaseModel):
    id: int
    goal_name: str
    description: Optional[str]
    weeks: int
    status: str
    created_at: datetime

class TaskResponse(BaseModel):
    id: int
    goal_id: int
    week_number: int
    title: str
    description: Optional[str]
    scheduled_date: datetime
    status: str

class SubTaskResponse(BaseModel):
    id: int
    task_id: int
    description: str
    scheduled_date: datetime
    status: str

class TaskUpdate(BaseModel):
    status: str

class ScheduleRequest(BaseModel):
    skill: str
    duration_weeks: int

# Configure Google Gemini API
api_key = os.getenv("GEMINI_API_KEY")
if api_key:
    genai.configure(api_key=api_key)
    print(f"[DEBUG] Gemini API configured successfully")
else:
    print("[WARNING] GEMINI_API_KEY not found in environment variables")

# Database Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./goals_app.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

# Enable SQLite foreign key constraints for cascade deletes
from sqlalchemy import event
@event.listens_for(engine, "connect")
def enable_sqlite_fk(dbapi_connection, connection_record):
    if "sqlite" in DATABASE_URL:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

# Authentication setup
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/token")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-super-secret-key-change-this-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Create FastAPI app
app = FastAPI(title="Goal Achievement API", description="A comprehensive goal and task management system")

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === DATABASE SETUP ===
def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session():
    with Session(engine) as session:
        yield session

# === AUTHENTICATION FUNCTIONS ===
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_user(session: Session, username: str) -> Optional[User]:
    statement = select(User).where(User.username == username)
    return session.exec(statement).first()

def authenticate_user(session: Session, username: str, password: str) -> Optional[User]:
    user = get_user(session, username)
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user

def get_current_user(session: Session = Depends(get_session), token: str = Depends(oauth2_scheme)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except jwt.JWTError:
        raise credentials_exception
    
    user = get_user(session, username=username)
    if user is None:
        raise credentials_exception
    return user

# === BACKGROUND TASKS ===
def send_email_notification(user_email: str, subject: str, message: str):
    # Placeholder for email sending logic
    print(f"[NOTIFICATION] Sending email to {user_email}: {subject} - {message}")

def generate_ai_tasks(goal_id: int, goal_name: str, weeks: int):
    """Generate AI-powered task breakdown using JSON format"""
    print(f"[DEBUG] Starting generate_ai_tasks for goal_id={goal_id}, goal_name={goal_name}, weeks={weeks}")
    
    with Session(engine) as session:
        try:
            if not api_key:
                print("[WARNING] No Gemini API key, creating generic tasks")
                create_generic_tasks(goal_id, weeks, session)
                return
            
            # Enhanced JSON-based prompt
            prompt = f"""
            Create a detailed {weeks}-week learning plan for the goal: "{goal_name}"
            
            Return your response as a valid JSON object with this exact structure:
            {{
                "goal": "{goal_name}",
                "total_weeks": {weeks},
                "weeks": [
                    {{
                        "week_number": 1,
                        "title": "Week 1: Introduction and Basics",
                        "focus": "Main learning objectives for this week",
                        "daily_tasks": [
                            "Day 1: Specific task description",
                            "Day 2: Another specific task",
                            "Day 3: Continue with next task",
                            "Day 4: Practice and reinforce",
                            "Day 5: Apply what you learned",
                            "Day 6: Review and consolidate",
                            "Day 7: Rest or light practice"
                        ]
                    }}
                ]
            }}
            
            Guidelines:
            - Create exactly {weeks} week objects
            - Each week should have 7 daily tasks (can include rest days)
            - Tasks should be specific, actionable, and progressive
            - Focus should be a brief summary of the week's main objectives
            - Ensure proper JSON formatting with no syntax errors
            - Do not include any text outside the JSON object
            """
            
            print(f"[DEBUG] Sending prompt to AI...")
            model = genai.GenerativeModel("models/gemini-1.5-flash")
            response = model.generate_content(prompt)
            schedule_text = response.text or ""
            print(f"[DEBUG] Raw AI Response received")
            
            if not schedule_text.strip():
                print("[DEBUG] Empty AI response, creating generic tasks")
                create_generic_tasks(goal_id, weeks, session)
                return
            
            # Clean the response to extract JSON
            json_text = extract_json_from_response(schedule_text)
            if not json_text:
                print("[DEBUG] No valid JSON found in response, using text fallback")
                create_tasks_from_text_fallback(goal_id, schedule_text, weeks, session)
                return
                
            # Parse JSON response
            try:
                schedule_data = json.loads(json_text)
                print(f"[DEBUG] Parsed JSON successfully")
            except json.JSONDecodeError as e:
                print(f"[DEBUG] JSON parsing error: {e}, using text fallback")
                create_tasks_from_text_fallback(goal_id, schedule_text, weeks, session)
                return
            
            # Validate JSON structure
            if not validate_schedule_json(schedule_data, weeks):
                print("[DEBUG] Invalid JSON structure, using text fallback")
                create_tasks_from_text_fallback(goal_id, schedule_text, weeks, session)
                return
            
            # Create tasks from JSON data
            create_tasks_from_json(goal_id, schedule_data, session)
            print(f"[DEBUG] Successfully created tasks for goal_id={goal_id}")
            
        except Exception as e:
            print(f"[ERROR] Exception in generate_ai_tasks: {e}")
            # Fallback to generic tasks
            create_generic_tasks(goal_id, weeks, session)

def extract_json_from_response(text: str) -> str:
    """Extract JSON from AI response that might contain extra text"""
    # Try to find JSON object in the response
    json_pattern = r'\{.*\}'
    matches = re.findall(json_pattern, text, re.DOTALL)
    
    if matches:
        return matches[0]  # Return the first JSON-like object
    
    # If no JSON found, try to find content between ```json blocks
    json_block_pattern = r'```json\s*(.*?)\s*```'
    matches = re.findall(json_block_pattern, text, re.DOTALL | re.IGNORECASE)
    
    if matches:
        return matches[0]
    
    return text.strip()

def validate_schedule_json(data: dict, expected_weeks: int) -> bool:
    """Validate the JSON structure from AI response"""
    try:
        required_fields = ['weeks']
        if not all(field in data for field in required_fields):
            print(f"[DEBUG] Missing required fields: {required_fields}")
            return False
        
        weeks_data = data['weeks']
        if not isinstance(weeks_data, list):
            print("[DEBUG] 'weeks' is not a list")
            return False
        
        if len(weeks_data) == 0:
            print("[DEBUG] No weeks data found")
            return False
        
        # Validate each week structure
        for week in weeks_data:
            required_week_fields = ['week_number', 'title', 'daily_tasks']
            if not all(field in week for field in required_week_fields):
                print(f"[DEBUG] Week missing required fields: {required_week_fields}")
                return False
            
            if not isinstance(week['daily_tasks'], list):
                print("[DEBUG] daily_tasks is not a list")
                return False
        
        return True
    except Exception as e:
        print(f"[DEBUG] Validation error: {e}")
        return False

def create_tasks_from_json(goal_id: int, schedule_data: dict, session: Session):
    """Create tasks and subtasks from parsed JSON data"""
    start_date = datetime.now()
    weeks_data = schedule_data['weeks']
    
    for week_data in weeks_data:
        week_number = week_data.get('week_number', 1)
        week_title = week_data.get('title', f"Week {week_number}")
        week_focus = week_data.get('focus', '')
        daily_tasks = week_data.get('daily_tasks', [])
        
        # Calculate week start date
        week_start = start_date + timedelta(weeks=week_number - 1)
        
        # Create main weekly task
        main_task = Task(
            goal_id=goal_id,
            week_number=week_number,
            title=week_title,
            description=week_focus,
            scheduled_date=week_start,
            status=TaskStatus.PENDING
        )
        session.add(main_task)
        session.commit()
        session.refresh(main_task)
        print(f"[DEBUG] Created main_task: Week {week_number} - {week_title}")
        
        # Create daily subtasks
        for day_idx, task_desc in enumerate(daily_tasks[:7]):  # Max 7 days
            if task_desc and task_desc.strip():
                subtask_date = week_start + timedelta(days=day_idx)
                subtask = SubTask(
                    task_id=main_task.id,
                    description=task_desc.strip(),
                    scheduled_date=subtask_date,
                    status=TaskStatus.PENDING
                )
                session.add(subtask)
        
        session.commit()

def create_tasks_from_text_fallback(goal_id: int, text: str, weeks: int, session: Session):
    """Fallback method to parse text response when JSON parsing fails"""
    print("[DEBUG] Using text fallback parsing")
    
    # Enhanced text parsing that handles markdown
    week_pattern = r'(?:\*\*)?Week\s+(\d+)(?:\*\*)?:?\s*(.+?)(?=(?:\*\*)?Week\s+\d+|\Z)'
    week_matches = re.findall(week_pattern, text, re.DOTALL | re.IGNORECASE)
    
    if not week_matches:
        print("[DEBUG] No weeks found in text, creating generic tasks")
        create_generic_tasks(goal_id, weeks, session)
        return
    
    start_date = datetime.now()
    
    for week_num_str, week_content in week_matches[:weeks]:
        try:
            week_num = int(week_num_str)
        except ValueError:
            week_num = len(week_matches) + 1
        
        # Extract title (first line of content)
        content_lines = [line.strip() for line in week_content.split('\n') if line.strip()]
        week_title = f"Week {week_num}: {content_lines[0][:50]}..." if content_lines else f"Week {week_num}"
        
        # Extract tasks (look for bullet points, numbers, or just lines)
        tasks = []
        for line in content_lines[1:]:  # Skip title line
            # Remove markdown formatting and bullet points
            clean_line = re.sub(r'^[\*\-\+•]\s*', '', line)
            clean_line = re.sub(r'^\d+\.\s*', '', clean_line)
            clean_line = re.sub(r'\*\*(.*?)\*\*', r'\1', clean_line)  # Remove bold
            
            if clean_line and len(clean_line) > 10:  # Only meaningful tasks
                tasks.append(clean_line)
        
        # Create main task
        week_start = start_date + timedelta(weeks=week_num - 1)
        main_task = Task(
            goal_id=goal_id,
            week_number=week_num,
            title=week_title,
            description=f"Week {week_num} objectives",
            scheduled_date=week_start,
            status=TaskStatus.PENDING
        )
        session.add(main_task)
        session.commit()
        session.refresh(main_task)
        
        # Create subtasks
        for day_idx, task_desc in enumerate(tasks[:7]):
            subtask_date = week_start + timedelta(days=day_idx)
            subtask = SubTask(
                task_id=main_task.id,
                description=task_desc,
                scheduled_date=subtask_date,
                status=TaskStatus.PENDING
            )
            session.add(subtask)
        
        session.commit()
        print(f"[DEBUG] Created tasks for Week {week_num} using text fallback")

def create_generic_tasks(goal_id: int, weeks: int, session: Session):
    """Create generic tasks when AI parsing completely fails"""
    print("[DEBUG] Creating generic tasks as last resort")
    
    start_date = datetime.now()
    
    for week_num in range(1, weeks + 1):
        week_start = start_date + timedelta(weeks=week_num - 1)
        
        main_task = Task(
            goal_id=goal_id,
            week_number=week_num,
            title=f"Week {week_num}: Learning Phase",
            description=f"Focus on core concepts and practice for week {week_num}",
            scheduled_date=week_start,
            status=TaskStatus.PENDING
        )
        session.add(main_task)
        session.commit()
        session.refresh(main_task)
        
        # Create 5 generic daily tasks
        generic_tasks = [
            "Study core concepts and theory",
            "Practice with hands-on exercises",
            "Review and consolidate learning",
            "Apply knowledge to practical examples",
            "Reflect and prepare for next phase"
        ]
        
        for day_idx, task_desc in enumerate(generic_tasks):
            subtask_date = week_start + timedelta(days=day_idx)
            subtask = SubTask(
                task_id=main_task.id,
                description=task_desc,
                scheduled_date=subtask_date,
                status=TaskStatus.PENDING
            )
            session.add(subtask)
        
        session.commit()

# === STARTUP EVENT ===
@app.on_event("startup")
def on_startup():
    create_db_and_tables()
    print("[INFO] Database tables created successfully")

# === AUTHENTICATION ENDPOINTS ===
@app.post("/api/register", response_model=UserResponse)
def register_user(user: UserCreate, session: Session = Depends(get_session)):
    # Check if user already exists
    existing_user = session.exec(select(User).where(User.username == user.username)).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    existing_email = session.exec(select(User).where(User.email == user.email)).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    db_user = User(
        username=user.username,
        email=user.email,
        full_name=user.full_name,
        hashed_password=hashed_password
    )
    session.add(db_user)
    session.commit()
    session.refresh(db_user)
    print(f"[INFO] New user registered: {user.username}")
    return db_user

@app.post("/api/token", response_model=Token)
def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    user = authenticate_user(session, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    print(f"[INFO] User logged in: {user.username}")
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/users/me", response_model=UserResponse)
def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

# === GOAL MANAGEMENT ENDPOINTS ===
@app.post("/api/goals", response_model=GoalResponse)
def create_goal(
    goal: GoalCreate, 
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    db_goal = Goal(
        user_id=current_user.id,
        goal_name=goal.goal_name,
        description=goal.description,
        weeks=goal.weeks
    )
    session.add(db_goal)
    session.commit()
    session.refresh(db_goal)
    
    # Generate AI tasks in background
    background_tasks.add_task(generate_ai_tasks, db_goal.id, goal.goal_name, goal.weeks)
    
    print(f"[INFO] New goal created: {goal.goal_name} for user {current_user.username}")
    return db_goal

@app.get("/api/goals", response_model=List[GoalResponse])
def get_goals(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    statement = select(Goal).where(Goal.user_id == current_user.id)
    goals = session.exec(statement).all()
    return goals

@app.get("/api/goals/{goal_id}", response_model=GoalResponse)
def get_goal(
    goal_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    statement = select(Goal).where(Goal.id == goal_id, Goal.user_id == current_user.id)
    goal = session.exec(statement).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal

@app.put("/api/goals/{goal_id}", response_model=GoalResponse)
def update_goal(
    goal_id: int,
    goal_update: GoalCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    statement = select(Goal).where(Goal.id == goal_id, Goal.user_id == current_user.id)
    db_goal = session.exec(statement).first()
    if not db_goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    db_goal.goal_name = goal_update.goal_name
    db_goal.description = goal_update.description
    db_goal.weeks = goal_update.weeks
    db_goal.updated_at = datetime.utcnow()
    session.add(db_goal)
    session.commit()
    session.refresh(db_goal)
    return db_goal

@app.delete("/api/goals/{goal_id}")
def delete_goal(
    goal_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    statement = select(Goal).where(Goal.id == goal_id, Goal.user_id == current_user.id)
    goal = session.exec(statement).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    # Manually delete subtasks and tasks before deleting goal (for SQLite)
    task_ids = session.exec(select(Task.id).where(Task.goal_id == goal_id)).all()
    if task_ids:
        session.exec(delete(SubTask).where(SubTask.task_id.in_(task_ids)))
    # Delete tasks
    session.exec(delete(Task).where(Task.goal_id == goal_id))
    # Delete goal
    session.delete(goal)
    session.commit()
    print(f"[INFO] Goal deleted: {goal_id}")
    return {"message": "Goal deleted successfully"}

# === TASK MANAGEMENT ENDPOINTS ===
@app.get("/api/tasks/today", response_model=List[TaskResponse])
def get_today_tasks(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    today = datetime.now().date()
    statement = select(Task).join(Goal).where(
        Goal.user_id == current_user.id,
        Task.scheduled_date >= today,
        Task.scheduled_date < today + timedelta(days=1)
    )
    tasks = session.exec(statement).all()
    return tasks

@app.get("/api/goals/{goal_id}/tasks", response_model=List[TaskResponse])
def get_goal_tasks(
    goal_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    # Verify goal ownership
    goal_statement = select(Goal).where(Goal.id == goal_id, Goal.user_id == current_user.id)
    goal = session.exec(goal_statement).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    statement = select(Task).where(Task.goal_id == goal_id)
    tasks = session.exec(statement).all()
    return tasks

@app.get("/api/tasks/{task_id}/subtasks", response_model=List[SubTaskResponse])
def get_task_subtasks(
    task_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    # Verify task ownership through goal
    statement = select(Task).join(Goal).where(
        Task.id == task_id,
        Goal.user_id == current_user.id
    )
    task = session.exec(statement).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    subtask_statement = select(SubTask).where(SubTask.task_id == task_id)
    subtasks = session.exec(subtask_statement).all()
    return subtasks

@app.put("/api/tasks/{task_id}", response_model=TaskResponse)
def update_task_status(
    task_id: int,
    task_update: TaskUpdate,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    # Verify task ownership through goal
    statement = select(Task).join(Goal).where(
        Task.id == task_id,
        Goal.user_id == current_user.id
    )
    task = session.exec(statement).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task.status = TaskStatus(task_update.status)
    task.updated_at = datetime.utcnow()
    session.add(task)
    session.commit()
    session.refresh(task)
    
    # Send notification if task completed
    if task_update.status == "completed":
        background_tasks.add_task(
            send_email_notification,
            current_user.email,
            "Task Completed!",
            f"Great job! You've completed: {task.title}"
        )
    
    return task

@app.put("/api/subtasks/{subtask_id}", response_model=SubTaskResponse)
def update_subtask_status(
    subtask_id: int,
    task_update: TaskUpdate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    # Verify subtask ownership through task and goal
    statement = select(SubTask).join(Task).join(Goal).where(
        SubTask.id == subtask_id,
        Goal.user_id == current_user.id
    )
    subtask = session.exec(statement).first()
    if not subtask:
        raise HTTPException(status_code=404, detail="Subtask not found")
    
    subtask.status = TaskStatus(task_update.status)
    subtask.updated_at = datetime.utcnow()
    session.add(subtask)
    session.commit()
    session.refresh(subtask)
    
    return subtask

# === CALENDAR INTEGRATION ===
@app.get("/api/calendar/{goal_id}")
def get_goal_calendar(
    goal_id: int,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    # Verify goal ownership
    goal_statement = select(Goal).where(Goal.id == goal_id, Goal.user_id == current_user.id)
    goal = session.exec(goal_statement).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    # Get all tasks for the goal
    statement = select(Task).where(Task.goal_id == goal_id)
    tasks = session.exec(statement).all()
    
    # Create calendar
    cal = Calendar()
    for task in tasks:
        event = Event()
        event.name = task.title
        event.begin = task.scheduled_date.replace(tzinfo=timezone.utc)
        event.end = task.scheduled_date.replace(tzinfo=timezone.utc) + timedelta(hours=1)
        event.description = task.description or ""
        cal.events.add(event)
    
    # Save to file and return
    filename = f"goal_{goal_id}_calendar_{uuid.uuid4().hex}.ics"
    filepath = os.path.join("/tmp", filename)
    with open(filepath, "wb") as f:
        f.write(cal.serialize().encode("utf-8"))
    
    return FileResponse(filepath, media_type="text/calendar; charset=utf-8", filename=filename)

# === DASHBOARD ENDPOINTS ===
@app.get("/api/dashboard")
def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_session)
):
    # Get user's goals
    goals = session.exec(select(Goal).where(Goal.user_id == current_user.id)).all()
    
    # Calculate stats
    total_goals = len(goals)
    active_goals = len([g for g in goals if g.status == GoalStatus.ACTIVE])
    completed_goals = len([g for g in goals if g.status == GoalStatus.COMPLETED])
    
    # Get tasks stats
    all_tasks = []
    for goal in goals:
        tasks = session.exec(select(Task).where(Task.goal_id == goal.id)).all()
        all_tasks.extend(tasks)
    
    total_tasks = len(all_tasks)
    completed_tasks = len([t for t in all_tasks if t.status == TaskStatus.COMPLETED])
    pending_tasks = len([t for t in all_tasks if t.status == TaskStatus.PENDING])
    in_progress_tasks = len([t for t in all_tasks if t.status == TaskStatus.IN_PROGRESS])
    
    # Get today's tasks
    today = datetime.now().date()
    today_tasks = [t for t in all_tasks if t.scheduled_date.date() == today]
    
    return {
        "total_goals": total_goals,
        "active_goals": active_goals,
        "completed_goals": completed_goals,
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "pending_tasks": pending_tasks,
        "in_progress_tasks": in_progress_tasks,
        "completion_rate": round((completed_tasks / total_tasks * 100) if total_tasks > 0 else 0, 1),
        "today_tasks": len(today_tasks),
        "today_completed": len([t for t in today_tasks if t.status == TaskStatus.COMPLETED])
    }

# Keep the original generate-schedule endpoint for compatibility
@app.post("/api/generate-schedule")
async def generate_schedule(req: ScheduleRequest):
    try:
        if not api_key:
            raise HTTPException(status_code=500, detail="Gemini API key not configured")
            
        prompt = (
            f"Create a beginner-friendly weekly learning schedule for {req.skill} over {req.duration_weeks} weeks. "
            "Include topics and small projects/examples. Format exactly as: "
            "Week 1: <one paragraph>. Week 2: <one paragraph>. ... Keep it plain text."
        )
        model = genai.GenerativeModel("models/gemini-1.5-flash")
        response = model.generate_content(prompt)
        schedule_text = response.text or ""
        print("[INFO] Schedule generated successfully")
        
        return {"schedule": schedule_text, "message": "Schedule generated successfully"}
    except Exception as e:
        print(f"[ERROR] Error generating schedule: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Root endpoint
@app.get("/api/")
async def root():
    return {"message": "Goal Achievement API is running!", "version": "1.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)