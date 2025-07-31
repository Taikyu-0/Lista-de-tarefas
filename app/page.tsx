"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Play, Pause, Trash2, Plus, Zap, Gamepad2, Download, FileSpreadsheet, FileText, Wifi, WifiOff } from "lucide-react"
import { ThemeToggle } from "@/components/theme-toggle"
import jsPDF from "jspdf"
import { exportToCSV } from "../utils/export-utils"

interface Task {
  id: string
  name: string
  category: "criacao" | "ajustes"
  totalTime: number
  currentTime: number
  isRunning: boolean
  createdAt?: string
}

const colorClasses = [
  "random-color-1",
  "random-color-2",
  "random-color-3",
  "random-color-4",
  "random-color-5",
  "random-color-6",
  "random-color-7",
  "random-color-8",
]

export default function TodoTimerApp() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [newTaskName, setNewTaskName] = useState("")
  const [newTaskCategory, setNewTaskCategory] = useState<"criacao" | "ajustes">("criacao")
  const [randomColorClass, setRandomColorClass] = useState("")
  const [isOnline, setIsOnline] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [runningTasks, setRunningTasks] = useState<Set<string>>(new Set())

  // Verificar conectividade
  useEffect(() => {
    const checkOnlineStatus = () => {
      setIsOnline(navigator.onLine)
    }

    window.addEventListener('online', checkOnlineStatus)
    window.addEventListener('offline', checkOnlineStatus)
    checkOnlineStatus()

    return () => {
      window.removeEventListener('online', checkOnlineStatus)
      window.removeEventListener('offline', checkOnlineStatus)
    }
  }, [])

  // Gerar cor aleatória no carregamento
  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * colorClasses.length)
    setRandomColorClass(colorClasses[randomIndex])
  }, [])

  // Função para parar todas as tarefas
  const stopAllTasks = () => {
    setRunningTasks(new Set())
    setTasks((prevTasks) => 
      prevTasks.map((task) => ({
        ...task,
        isRunning: false,
        totalTime: task.totalTime + task.currentTime,
        currentTime: 0
      }))
    )
  }

  // Função para parar uma tarefa específica
  const stopTask = (taskId: string) => {
    setRunningTasks((prev) => {
      const newSet = new Set(prev)
      newSet.delete(taskId)
      return newSet
    })
    
    setTasks((prevTasks) => 
      prevTasks.map((task) => {
        if (task.id === taskId) {
          return {
            ...task,
            isRunning: false,
            totalTime: task.totalTime + task.currentTime,
            currentTime: 0
          }
        }
        return task
      })
    )
  }

  // Carregar tarefas do backend
  useEffect(() => {
    loadTasks()
  }, [])

  const loadTasks = async () => {
    try {
      setIsLoading(true)
      // Parar todas as tarefas antes de carregar
      stopAllTasks()
      
      const response = await fetch('/api/tasks')
      if (response.ok) {
        const data = await response.json()
        // Garantir que as tarefas carregadas não estejam rodando
        const tasksWithoutRunning = (data.tasks || []).map((task: Task) => ({
          ...task,
          isRunning: false,
          currentTime: 0
        }))
        setTasks(tasksWithoutRunning)
      }
    } catch (error) {
      console.error('Erro ao carregar tarefas:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const addTask = async () => {
    if (newTaskName.trim() !== "") {
      try {
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: newTaskName.trim(),
            category: newTaskCategory,
          }),
        })

        if (response.ok) {
          const data = await response.json()
          setTasks([...tasks, data.task])
          setNewTaskName("")
        }
      } catch (error) {
        console.error('Erro ao adicionar tarefa:', error)
        // Fallback para modo offline
        const newTask: Task = {
          id: Date.now().toString(),
          name: newTaskName.trim(),
          category: newTaskCategory,
          totalTime: 0,
          currentTime: 0,
          isRunning: false,
        }
        setTasks([...tasks, newTask])
        setNewTaskName("")
      }
    }
  }

  const removeTask = async (taskId: string) => {
    // Parar tarefa se estiver rodando
    stopTask(taskId)
    
    setTasks((prevTasks) => {
      return prevTasks.filter((task) => task.id !== taskId)
    })

    try {
      await fetch(`/api/tasks?id=${taskId}`, {
        method: 'DELETE',
      })
    } catch (error) {
      console.error('Erro ao remover tarefa:', error)
    }
  }

  const toggleTimer = async (taskId: string) => {
    setTasks((prevTasks) => {
      return prevTasks.map((task) => {
        if (task.id === taskId) {
          if (task.isRunning) {
            // Parar o cronômetro
            stopTask(taskId)
            const updatedTask = {
              ...task,
              isRunning: false,
              totalTime: task.totalTime + task.currentTime,
              currentTime: 0,
            }

            // Salvar no backend
            updateTaskInBackend(taskId, updatedTask)

            return updatedTask
          } else {
            // Iniciar o cronômetro
            setRunningTasks((prev) => {
              const newSet = new Set(prev)
              newSet.add(taskId)
              return newSet
            })

            const updatedTask = {
              ...task,
              isRunning: true,
            }

            // Salvar no backend
            updateTaskInBackend(taskId, updatedTask)

            return updatedTask
          }
        }
        return task
      })
    })
  }

  const updateTaskInBackend = async (taskId: string, updates: any) => {
    try {
      await fetch('/api/tasks', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: taskId,
          updates,
        }),
      })
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error)
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const getTotalTimeForTask = (task: Task) => {
    return task.totalTime + task.currentTime
  }

  const criacaoTasks = tasks.filter((task) => task.category === "criacao")
  const ajustesTasks = tasks.filter((task) => task.category === "ajustes")

  // Função para exportar para Excel
  const exportToExcel = () => {
    exportToCSV(tasks, formatTime)
  }

  // Função para exportar para PDF
  const exportToPDF = () => {
    const doc = new jsPDF()

    // Título
    doc.setFontSize(20)
    doc.setFont("helvetica", "bold")
    doc.text("LISTA DO RAFA - RELATÓRIO DE TAREFAS", 20, 30)

    // Data
    const today = new Date().toLocaleDateString("pt-BR")
    doc.setFontSize(12)
    doc.setFont("helvetica", "normal")
    doc.text(`Data: ${today}`, 20, 45)

    let yPosition = 65

    // Seção Criação
    if (criacaoTasks.length > 0) {
      doc.setFontSize(16)
      doc.setFont("helvetica", "bold")
      doc.text("🎨 CRIAÇÃO", 20, yPosition)
      yPosition += 15

      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")

      criacaoTasks.forEach((task) => {
        if (yPosition > 270) {
          doc.addPage()
          yPosition = 30
        }
        doc.text(`• ${task.name}`, 25, yPosition)
        doc.text(`Tempo: ${formatTime(getTotalTimeForTask(task))}`, 140, yPosition)
        yPosition += 10
      })

      yPosition += 10
    }

    // Seção Ajustes
    if (ajustesTasks.length > 0) {
      if (yPosition > 250) {
        doc.addPage()
        yPosition = 30
      }

      doc.setFontSize(16)
      doc.setFont("helvetica", "bold")
      doc.text("⚙️ AJUSTES", 20, yPosition)
      yPosition += 15

      doc.setFontSize(10)
      doc.setFont("helvetica", "normal")

      ajustesTasks.forEach((task) => {
        if (yPosition > 270) {
          doc.addPage()
          yPosition = 30
        }
        doc.text(`• ${task.name}`, 25, yPosition)
        doc.text(`Tempo: ${formatTime(getTotalTimeForTask(task))}`, 140, yPosition)
        yPosition += 10
      })

      yPosition += 15
    }

    // Resumo
    if (yPosition > 220) {
      doc.addPage()
      yPosition = 30
    }

    doc.setFontSize(16)
    doc.setFont("helvetica", "bold")
    doc.text("🏆 ESTATÍSTICAS FINAIS", 20, yPosition)
    yPosition += 20

    doc.setFontSize(12)
    doc.setFont("helvetica", "normal")
    doc.text(
      `Tempo em Criação: ${formatTime(criacaoTasks.reduce((total, task) => total + getTotalTimeForTask(task), 0))}`,
      25,
      yPosition,
    )
    yPosition += 15
    doc.text(
      `Tempo em Ajustes: ${formatTime(ajustesTasks.reduce((total, task) => total + getTotalTimeForTask(task), 0))}`,
      25,
      yPosition,
    )
    yPosition += 15
    doc.setFont("helvetica", "bold")
    doc.text(
      `TEMPO TOTAL: ${formatTime(tasks.reduce((total, task) => total + getTotalTimeForTask(task), 0))}`,
      25,
      yPosition,
    )

    // Footer
    doc.setFontSize(8)
    doc.setFont("helvetica", "italic")
    doc.text("Gerado pela Lista do Rafa - sempre da merda", 20, 285)

    doc.save(`Lista_do_Rafa_${today.replace(/\//g, "-")}.pdf`)
  }

  // Timer principal que gerencia todos os cronômetros
  useEffect(() => {
    if (runningTasks.size === 0) return

    const interval = setInterval(() => {
      setTasks((prevTasks) => {
        return prevTasks.map((task) => {
          if (runningTasks.has(task.id) && task.isRunning) {
            return { ...task, currentTime: task.currentTime + 1 }
          }
          return task
        })
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [runningTasks])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAllTasks()
    }
  }, [])

  return (
    <div className="min-h-screen pixel-background">
      <div className="content-overlay p-4">
        <div className="max-w-6xl mx-auto">
          {/* Header angular com animação de onda de cores */}
          <div
            className={`flex justify-between items-center mb-8 p-6 angular-header color-wave-angular ${randomColorClass}`}
          >
            <div className="flex items-center gap-4">
              <Gamepad2 className="w-10 h-10 text-white" />
              <h1 className="text-4xl font-black text-white ng-font text-enhanced">LISTA DO RAFA</h1>
            </div>
            <div className="flex items-center gap-4">
              {/* Status de conectividade */}
              <div className="flex items-center gap-2">
                {isOnline ? (
                  <Wifi className="w-5 h-5 text-green-400" />
                ) : (
                  <WifiOff className="w-5 h-5 text-red-400" />
                )}
                <span className="text-xs text-white">
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              <ThemeToggle />
            </div>
          </div>

          {/* Formulário angular */}
          <div className="mb-8 p-6 angular-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 icon-container-gradient flex items-center justify-center">
                <Plus className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-orange-400 ng-font text-enhanced">NOVA TAREFA</h2>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Input
                type="text"
                placeholder="Digite o nome da tarefa..."
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    addTask()
                  }
                }}
                className="flex-1 bg-gray-700/90 backdrop-blur-sm border-gray-600 text-white placeholder-gray-400 ng-font border-0"
                style={{
                  borderRadius: 0,
                  clipPath: "polygon(0 0, calc(100% - 5px) 0, 100% 5px, 100% 100%, 5px 100%, 0 calc(100% - 5px))",
                }}
              />
              <Select
                value={newTaskCategory}
                onValueChange={(value: "criacao" | "ajustes") => setNewTaskCategory(value)}
              >
                <SelectTrigger
                  className="w-full sm:w-40 bg-gray-700/90 backdrop-blur-sm border-gray-600 text-white ng-font border-0"
                  style={{ borderRadius: 0 }}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700/95 backdrop-blur-sm border-gray-600" style={{ borderRadius: 0 }}>
                  <SelectItem value="criacao" className="text-white hover:bg-gray-600">
                    🎨 Criação
                  </SelectItem>
                  <SelectItem value="ajustes" className="text-white hover:bg-gray-600">
                    ⚙️ Ajustes
                  </SelectItem>
                </SelectContent>
              </Select>
              <button
                onClick={addTask}
                disabled={isLoading}
                className="px-6 py-2 angular-button text-white font-bold ng-font w-full sm:w-auto disabled:opacity-50"
              >
                {isLoading ? 'ADICIONANDO...' : 'ADICIONAR'}
              </button>
            </div>
          </div>

          {/* Grid angular */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Coluna Criação */}
            <div className="angular-card overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-600 to-blue-800 p-4"
                style={{ clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)" }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 icon-container-blue flex items-center justify-center">
                    <span className="text-white font-bold text-lg">🎨</span>
                  </div>
                  <h2 className="text-2xl font-black text-white ng-font text-enhanced">
                    CRIAÇÃO ({criacaoTasks.length})
                  </h2>
                </div>
              </div>
              <div className="p-4">
                <div className="space-y-4">
                  {criacaoTasks.length === 0 ? (
                    <div className="text-center py-8">
                      <Zap className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-300 ng-font text-enhanced">Se aqui estiver vazio... fudeu big friend</p>
                    </div>
                  ) : (
                    criacaoTasks.map((task) => (
                      <div
                        key={task.id}
                        className="p-4 task-card"
                        style={{
                          clipPath:
                            "polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))",
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-bold text-white ng-font text-lg text-enhanced">{task.name}</h3>
                            <p className="text-blue-400 text-sm ng-font text-enhanced">
                              ⏱️ Total: {formatTime(getTotalTimeForTask(task))}
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <div
                              className="timer-display px-4 py-2 border-blue-500"
                              style={{
                                clipPath:
                                  "polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))",
                              }}
                            >
                              <span className="text-2xl font-mono text-blue-400 font-bold">
                                {formatTime(getTotalTimeForTask(task))}
                              </span>
                            </div>

                            <button
                              onClick={() => toggleTimer(task.id)}
                              className={`p-2 border-2 font-bold action-button ${
                                task.isRunning
                                  ? "bg-red-600 border-red-400 text-white hover:bg-red-500"
                                  : "bg-green-600 border-green-400 text-white hover:bg-green-500"
                              }`}
                            >
                              {task.isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                            </button>

                            <button
                              onClick={() => removeTask(task.id)}
                              className="p-2 bg-red-600 border-2 border-red-400 text-white hover:bg-red-500 action-button"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Coluna Ajustes */}
            <div className="angular-card overflow-hidden">
              <div
                className="bg-gradient-to-r from-green-600 to-green-800 p-4"
                style={{ clipPath: "polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)" }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 icon-container-green flex items-center justify-center">
                    <span className="text-white font-bold text-lg">⚙️</span>
                  </div>
                  <h2 className="text-2xl font-black text-white ng-font text-enhanced">
                    AJUSTES ({ajustesTasks.length})
                  </h2>
                </div>
              </div>
              <div className="p-4">
                <div className="space-y-4">
                  {ajustesTasks.length === 0 ? (
                    <div className="text-center py-8">
                      <Zap className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-300 ng-font text-enhanced">Nenhum B.O até agr , bizarro</p>
                    </div>
                  ) : (
                    ajustesTasks.map((task) => (
                      <div
                        key={task.id}
                        className="p-4 task-card"
                        style={{
                          clipPath:
                            "polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))",
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-bold text-white ng-font text-lg text-enhanced">{task.name}</h3>
                            <p className="text-green-400 text-sm ng-font text-enhanced">
                              ⏱️ Total: {formatTime(getTotalTimeForTask(task))}
                            </p>
                          </div>

                          <div className="flex items-center gap-3">
                            <div
                              className="timer-display px-4 py-2 border-green-500"
                              style={{
                                clipPath:
                                  "polygon(0 0, calc(100% - 4px) 0, 100% 4px, 100% 100%, 4px 100%, 0 calc(100% - 4px))",
                              }}
                            >
                              <span className="text-2xl font-mono text-green-400 font-bold">
                                {formatTime(getTotalTimeForTask(task))}
                              </span>
                            </div>

                            <button
                              onClick={() => toggleTimer(task.id)}
                              className={`p-2 border-2 font-bold action-button ${
                                task.isRunning
                                  ? "bg-red-600 border-red-400 text-white hover:bg-red-500"
                                  : "bg-green-600 border-green-400 text-white hover:bg-green-500"
                              }`}
                            >
                              {task.isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                            </button>

                            <button
                              onClick={() => removeTask(task.id)}
                              className="p-2 bg-red-600 border-2 border-red-400 text-white hover:bg-red-500 action-button"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Resumo angular */}
          {tasks.length > 0 && (
            <div className="mt-8 angular-card overflow-hidden">
              <div
                className="bg-gradient-to-r from-orange-600 to-red-600 p-4"
                style={{ clipPath: "polygon(0 0, calc(100% - 15px) 0, 100% 15px, 100% 100%, 0 100%)" }}
              >
                <h2 className="text-2xl font-black text-white ng-font text-center text-enhanced">
                  🏆 ESTATÍSTICAS FINAIS 🏆
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div
                    className="text-center task-card p-6"
                    style={{
                      clipPath: "polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))",
                    }}
                  >
                    <div className="text-4xl font-black text-blue-400 ng-font mb-2 text-enhanced">
                      {formatTime(criacaoTasks.reduce((total, task) => total + getTotalTimeForTask(task), 0))}
                    </div>
                    <p className="text-blue-300 font-bold ng-font text-enhanced">🎨 CRIAÇÃO</p>
                  </div>
                  <div
                    className="text-center task-card p-6"
                    style={{
                      clipPath: "polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))",
                    }}
                  >
                    <div className="text-4xl font-black text-green-400 ng-font mb-2 text-enhanced">
                      {formatTime(ajustesTasks.reduce((total, task) => total + getTotalTimeForTask(task), 0))}
                    </div>
                    <p className="text-green-300 font-bold ng-font text-enhanced">⚙️ AJUSTES</p>
                  </div>
                  <div
                    className="text-center task-card p-6"
                    style={{
                      clipPath: "polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px))",
                    }}
                  >
                    <div className="text-4xl font-black text-orange-400 ng-font mb-2 text-enhanced">
                      {formatTime(tasks.reduce((total, task) => total + getTotalTimeForTask(task), 0))}
                    </div>
                    <p className="text-orange-300 font-bold ng-font text-enhanced">🔥 TOTAL</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Botão de Exportação angular */}
          {tasks.length > 0 && (
            <div className="mt-8 text-center">
              <div className="angular-card p-6">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <Download className="w-6 h-6 text-purple-400" />
                  <h3 className="text-2xl font-bold text-purple-400 ng-font text-enhanced">EXPORTAR DADOS</h3>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={exportToExcel}
                    className="flex items-center gap-3 px-6 py-3 bg-green-600 hover:bg-green-500 border-2 border-green-400 text-white font-bold ng-font angular-button"
                  >
                    <FileSpreadsheet className="w-5 h-5" />
                    CSV/EXCEL (.csv)
                  </button>

                  <button
                    onClick={exportToPDF}
                    className="flex items-center gap-3 px-6 py-3 bg-red-600 hover:bg-red-500 border-2 border-red-400 text-white font-bold ng-font angular-button"
                  >
                    <FileText className="w-5 h-5" />
                    PDF (.pdf)
                  </button>
                </div>

                <p className="text-gray-300 text-sm mt-4 ng-font text-enhanced">📊 Exporte teste aaaa</p>
              </div>
            </div>
          )}

          {/* Footer angular */}
          <div className="mt-8 text-center">
            <p className="text-gray-400 ng-font text-enhanced">⚡ LISTA DO RAFA - sempre da merda ⚡</p>
          </div>
        </div>
      </div>
    </div>
  )
}
