import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

const dataFilePath = path.join(process.cwd(), 'data', 'tasks.json')

// Garantir que o diretório data existe
const ensureDataDir = () => {
  const dataDir = path.dirname(dataFilePath)
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
}

// Ler tarefas do arquivo
const readTasks = () => {
  try {
    ensureDataDir()
    if (fs.existsSync(dataFilePath)) {
      const data = fs.readFileSync(dataFilePath, 'utf-8')
      return JSON.parse(data)
    }
    return []
  } catch (error) {
    console.error('Erro ao ler tarefas:', error)
    return []
  }
}

// Salvar tarefas no arquivo
const saveTasks = (tasks: any[]) => {
  try {
    ensureDataDir()
    fs.writeFileSync(dataFilePath, JSON.stringify(tasks, null, 2))
    return true
  } catch (error) {
    console.error('Erro ao salvar tarefas:', error)
    return false
  }
}

// GET - Buscar todas as tarefas
export async function GET() {
  try {
    const tasks = readTasks()
    return NextResponse.json({ tasks })
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao buscar tarefas' },
      { status: 500 }
    )
  }
}

// POST - Criar nova tarefa
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, category } = body

    if (!name || !category) {
      return NextResponse.json(
        { error: 'Nome e categoria são obrigatórios' },
        { status: 400 }
      )
    }

    const tasks = readTasks()
    const newTask = {
      id: Date.now().toString(),
      name: name.trim(),
      category,
      totalTime: 0,
      currentTime: 0,
      isRunning: false,
      createdAt: new Date().toISOString()
    }

    tasks.push(newTask)
    saveTasks(tasks)

    return NextResponse.json({ task: newTask })
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao criar tarefa' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar tarefa
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, updates } = body

    if (!id) {
      return NextResponse.json(
        { error: 'ID da tarefa é obrigatório' },
        { status: 400 }
      )
    }

    const tasks = readTasks()
    const taskIndex = tasks.findIndex((task: any) => task.id === id)

    if (taskIndex === -1) {
      return NextResponse.json(
        { error: 'Tarefa não encontrada' },
        { status: 404 }
      )
    }

    tasks[taskIndex] = { ...tasks[taskIndex], ...updates }
    saveTasks(tasks)

    return NextResponse.json({ task: tasks[taskIndex] })
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao atualizar tarefa' },
      { status: 500 }
    )
  }
}

// DELETE - Remover tarefa
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID da tarefa é obrigatório' },
        { status: 400 }
      )
    }

    const tasks = readTasks()
    const filteredTasks = tasks.filter((task: any) => task.id !== id)
    
    if (filteredTasks.length === tasks.length) {
      return NextResponse.json(
        { error: 'Tarefa não encontrada' },
        { status: 404 }
      )
    }

    saveTasks(filteredTasks)

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Erro ao remover tarefa' },
      { status: 500 }
    )
  }
} 